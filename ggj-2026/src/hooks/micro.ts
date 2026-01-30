// useMicrophoneLevel.ts
import { computed, onScopeDispose, readonly, ref, type Ref } from "vue";

export interface MicrophoneLevelOptions {
  /**
   * 媒体约束配置
   * @default { audio: true }
   */
  constraints?: MediaStreamConstraints;
  /**
   * AnalyserNode的FFT大小
   * @default 2048
   */
  fftSize?: number;
  /**
   * 电平缩放因子
   * @default 1.4
   */
  scaleFactor?: number;
  /**
   * 自动开始
   * @default false
   */
  autoStart?: boolean;
}

export interface MicrophoneLevelResult {
  // 响应式状态
  level: Readonly<Ref<number>>; // 0-1 的电平值
  db: Readonly<Ref<number>>; // 分贝值
  isActive: Readonly<Ref<boolean>>; // 是否正在运行
  error: Readonly<Ref<string | null>>; // 错误信息

  // 方法
  start: () => Promise<void>; // 开始检测
  stop: () => void; // 停止检测
  toggle: () => Promise<void>; // 切换状态
  cleanup: () => void; // 清理资源

  // 计算属性
  levelPercentage: Readonly<Ref<number>>; // 电平百分比 0-100
  hasPermission: Readonly<Ref<boolean>>; // 是否有麦克风权限
}

/**
 * 计算时域数据的RMS值
 */
function calcRMSFromTimeDomain(buf: Uint8Array | undefined | null): number {
  if (!buf || buf.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i]! - 128) / 128; // 归一化到 [-1, 1]
    sum += v * v;
  }

  return Math.sqrt(sum / buf.length);
}

/**
 * 麦克风电平检测Hook
 */
export function useMicrophoneLevel(
  options: MicrophoneLevelOptions = {},
): MicrophoneLevelResult {
  const {
    constraints = { audio: true },
    fftSize = 2048,
    scaleFactor = 1.4,
    autoStart = false,
  } = options;

  // 响应式状态
  const level = ref(0);
  const db = ref(-Infinity);
  const isActive = ref(false);
  const error = ref<string | null>(null);
  const hasPermission = ref(false);

  // Web Audio API对象
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let stream: MediaStream | null = null;
  let dataArray: Uint8Array | null = null;
  let animationFrameId = 0;

  // 计算属性
  const levelPercentage = computed(() => Math.round(level.value * 100));

  /**
   * 更新循环 - 获取音频数据并计算电平
   */
  function updateLevel() {
    if (!analyser || !dataArray || !isActive.value) return;

    analyser.getByteTimeDomainData(dataArray as Uint8Array<ArrayBuffer>);
    const rms = calcRMSFromTimeDomain(dataArray);

    // 更新电平值
    level.value = Math.min(1, rms * scaleFactor);
    db.value = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

    // 继续下一帧
    if (isActive.value) {
      animationFrameId = requestAnimationFrame(updateLevel);
    }
  }

  /**
   * 开始麦克风检测
   */
  async function start(): Promise<void> {
    // 如果已经在运行，先停止
    if (isActive.value) {
      stop();
    }

    error.value = null;

    try {
      // 获取麦克风权限
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      hasPermission.value = true;

      // 创建音频上下文
      audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();

      // 创建分析节点
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      dataArray = new Uint8Array(analyser.fftSize) as Uint8Array;

      // 连接节点
      source.connect(analyser);

      // 如果上下文被挂起，恢复它
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // 更新状态
      isActive.value = true;

      // 开始更新循环
      updateLevel();
    } catch (err: any) {
      error.value = err?.message || String(err);
      hasPermission.value = false;
      stop();
      throw err;
    }
  }

  /**
   * 停止麦克风检测
   */
  function stop(): void {
    isActive.value = false;

    // 停止动画帧
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }

    // 断开音频节点
    if (source && analyser) {
      try {
        source.disconnect();
        analyser.disconnect();
      } catch (e) {
        // 忽略断开错误
      }
    }

    // 停止媒体轨道
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    // 关闭音频上下文
    if (audioContext) {
      try {
        audioContext.close();
      } catch (e) {
        // 忽略关闭错误
      }
      audioContext = null;
    }

    // 重置引用
    analyser = null;
    source = null;
    dataArray = null;

    // 重置电平值
    level.value = 0;
    db.value = -Infinity;
  }

  /**
   * 切换检测状态
   */
  async function toggle(): Promise<void> {
    if (isActive.value) {
      stop();
    } else {
      await start();
    }
  }

  /**
   * 完全清理资源
   */
  function cleanup(): void {
    stop();
    hasPermission.value = false;
    error.value = null;
  }

  // 自动开始（如果配置了）
  if (autoStart) {
    Promise.resolve().then(() => {
      if (!isActive.value) {
        start().catch(() => {
          // 自动启动失败，静默处理
        });
      }
    });
  }

  // 组件卸载时自动清理
  onScopeDispose(() => {
    cleanup();
  });

  return {
    // 响应式状态（只读）
    level: readonly(level),
    db: readonly(db),
    isActive: readonly(isActive),
    error: readonly(error),

    // 方法
    start,
    stop,
    toggle,
    cleanup,

    // 计算属性
    levelPercentage: readonly(levelPercentage),
    hasPermission: readonly(hasPermission),
  };
}

// 简化版本 - 返回原始值而不是ref
export function useSimpleMicrophoneLevel(options: MicrophoneLevelOptions = {}) {
  const { level, db, isActive, error, start, stop, toggle, cleanup } =
    useMicrophoneLevel(options);

  // 直接返回原始值而不是ref
  return {
    level: computed(() => level.value),
    db: computed(() => db.value),
    isActive: computed(() => isActive.value),
    error: computed(() => error.value),
    start,
    stop,
    toggle,
    cleanup,
  };
}

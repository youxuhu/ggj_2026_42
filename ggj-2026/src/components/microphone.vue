<!-- SimpleDemo.vue -->
<template>
  <div class="game-container">
    <!-- 跳跃方块的位置 -->
    <div ref="jumpBox" class="jump-box" @click="manualJump"></div>

    <!-- 地面 -->
    <div class="ground">
      <!-- 地刺容器 - 动态生成地刺 -->
      <div
        v-for="spike in spikes"
        :key="spike.id"
        class="spike"
        :data-id="spike.id"
        :style="{
          left: spike.initialLeft + 'px',
          transform: `translateX(${spike.currentOffset}px)`
        }"
      ></div>
    </div>

    <!-- 游戏结束弹窗 -->
    <div v-if="showGameOverDialog" class="game-over-dialog">
      <div class="dialog-content">
        <h3>游戏结束！</h3>
        <p>你坚持了 {{ gameTime.toFixed(1) }} 秒</p>
        <div class="score">最终分数: {{ score }}</div>
        <div class="dialog-buttons">
          <button @click="restartGame" class="restart-btn">重新开始</button>
          <button @click="quitGame" class="quit-btn">退出游戏</button>
        </div>
      </div>
    </div>

    <!-- 游戏信息面板 -->
    <div class="game-info">
      <div class="info-item">时间: {{ gameTime.toFixed(1) }}秒</div>
      <div class="info-item">分数: {{ score }}</div>
      <div class="info-item">地刺: {{ spikes.length }}/{{ maxSpikes }}</div>
      <div class="info-item">速度: {{ gameSpeed.toFixed(1) }}x</div>
      <div class="info-item">跳跃冷却: {{ jumpCoolDown.toFixed(0) }}ms</div>
      <div class="info-item">空中跳跃: {{ remainingAirJumps }}</div>
      <div class="info-item">响度: {{ (mic.level.value * 100).toFixed(1) }}%</div>
    </div>

    <!-- 调试信息 -->
    <div class="debug-info" v-if="showDebug">
      <div>方块位置: {{ boxPosition.top }}px</div>
      <div>方块底部: {{ boxPosition.bottom }}px</div>
      <div>地面位置: {{ groundLevel }}px</div>
      <div>跳跃高度: {{ jumpConfig.position }}px</div>
      <div>地刺数量: {{ spikes.length }}</div>
      <div>游戏状态: {{ gameOver ? '结束' : '进行中' }}</div>
      <div>跳跃状态: {{ jumpConfig.isJumping ? '跳跃中' : '在地面' }}</div>
      <div>是否在地面: {{ isOnGround() ? '是' : '否' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts" name="Micro">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import { useMicrophoneLevel } from "../hooks/micro";

/**
 * 跳跃配置接口
 */
interface JumpConfig {
  gravity: number; // 重力加速度
  velocity: number; // 当前速度
  position: number; // 当前位置（相对于初始位置）
  isJumping: boolean; // 是否正在跳跃
  airJumpsRemaining: number; // 空中跳跃剩余次数
  maxAirJumps: number; // 最大空中跳跃次数
}

/**
 * 地刺接口
 */
interface Spike {
  id: number;
  initialLeft: number; // 初始左侧位置（px）
  currentOffset: number; // 当前偏移量（px，负值表示向左移动）
  speed: number; // 移动速度（px/秒）
  element?: HTMLElement; // 地刺DOM元素引用
}

// ==================== 响应式状态 ====================
const jumpBox = ref<HTMLElement>();
const animationId = ref<number | null>(null);
const spikeAnimationId = ref<number | null>(null);
const collisionCheckId = ref<number | null>(null); // 碰撞检测动画ID
const lastJumpTime = ref(0);
const gameOver = ref(false);
const showGameOverDialog = ref(false);
const showDebug = ref(true);
const boxPosition = ref({ top: 0, bottom: 0, left: 0, right: 0 });

// 游戏统计数据
const gameTime = ref(0);
const score = ref(0);
const gameStartTime = ref(0);
const difficultyTimer = ref<number | null>(null);

// 游戏难度配置
const initialMaxSpikes = 8;
const maxSpikes = ref(initialMaxSpikes);
const gameSpeed = ref(1);
const spikeSpeedMultiplier = ref(1);

// 地面位置
const groundLevel = ref(0);

// ==================== 配置常量 ====================
const GRAVITY = 0.15;
const MAX_JUMP_HEIGHT = 250;
const SOUND_THRESHOLD = 0.05;
const JUMP_DEBOUNCE = 100;
const SPIKE_SPAWN_MIN_INTERVAL = 1500;
const SPIKE_SPAWN_MAX_INTERVAL = 3000;
const SPIKE_MIN_SPEED = 100;
const SPIKE_MAX_SPEED = 300;

// 跳跃冷却时间显示
const jumpCoolDown = ref(JUMP_DEBOUNCE);
// 空中跳跃剩余次数显示
const remainingAirJumps = ref(0);

// 难度提升间隔（秒）
const DIFFICULTY_INCREASE_INTERVAL = 30;

// 地刺管理
const spikes = ref<Spike[]>([]);
let spikeIdCounter = 0;
let spawnTimeout: number | null = null;
let lastUpdateTime = Date.now();

// 初始位置 - 方块距离地面100px
const initialBoxTop = ref(0);

const jumpConfig = ref<JumpConfig>({
  gravity: GRAVITY,
  velocity: 0,
  position: 0,
  isJumping: false,
  airJumpsRemaining: 2,
  maxAirJumps: 2,
});

const mic = useMicrophoneLevel({
  autoStart: true,
  fftSize: 512,
  scaleFactor: 2.0
});
const isActive = computed(() => mic.isActive.value);

/**
 * 计算初始位置
 */
const calculateInitialPosition = () => {
  groundLevel.value = window.innerHeight - 100;
  const boxHeight = 100;
  initialBoxTop.value = groundLevel.value - boxHeight;
  console.log('初始位置计算:', { groundLevel: groundLevel.value, initialTop: initialBoxTop.value });
  return initialBoxTop.value;
};

/**
 * 生成地刺
 */
const spawnSpike = () => {
  if (spikes.value.length >= maxSpikes.value) {
    scheduleNextSpike();
    return;
  }

  const windowWidth = window.innerWidth;
  const baseSpeed = SPIKE_MIN_SPEED + Math.random() * (SPIKE_MAX_SPEED - SPIKE_MIN_SPEED);
  const speed = baseSpeed * spikeSpeedMultiplier.value;

  const newSpike: Spike = {
    id: spikeIdCounter++,
    initialLeft: windowWidth + 100,
    currentOffset: 0,
    speed: speed,
  };

  spikes.value.push(newSpike);
  console.log('生成地刺:', newSpike);

  if (!gameOver.value) {
    score.value += Math.round(speed / 10);
  }

  scheduleNextSpike();
};

/**
 * 安排下一次地刺生成
 */
const scheduleNextSpike = () => {
  if (spawnTimeout) {
    clearTimeout(spawnTimeout);
  }

  const minInterval = SPIKE_SPAWN_MIN_INTERVAL / gameSpeed.value;
  const maxInterval = SPIKE_SPAWN_MAX_INTERVAL / gameSpeed.value;
  const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);

  spawnTimeout = window.setTimeout(() => {
    if (!gameOver.value) {
      spawnSpike();
    }
  }, randomInterval);
};

/**
 * 移除地刺
 */
const removeSpike = (id: number) => {
  spikes.value = spikes.value.filter(spike => spike.id !== id);
};

/**
 * 移动地刺
 */
const moveSpikes = () => {
  const now = Date.now();
  const deltaTime = (now - lastUpdateTime) / 1000;
  lastUpdateTime = now;

  spikes.value.forEach(spike => {
    spike.currentOffset -= spike.speed * deltaTime;

    const spikeElement = document.querySelector(`.spike[data-id="${spike.id}"]`) as HTMLElement;
    if (spikeElement) {
      spike.element = spikeElement;
      const rect = spikeElement.getBoundingClientRect();
      if (rect.right < -100) {
        removeSpike(spike.id);
      }
    }
  });

  updateBoxDebugInfo();

  if (!gameOver.value) {
    spikeAnimationId.value = requestAnimationFrame(moveSpikes);
  }
};

/**
 * 更新方块调试信息
 */
const updateBoxDebugInfo = () => {
  if (!jumpBox.value) return;

  const rect = jumpBox.value.getBoundingClientRect();
  boxPosition.value = {
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
  };

  remainingAirJumps.value = jumpConfig.value.airJumpsRemaining;

  const now = Date.now();
  jumpCoolDown.value = Math.max(0, JUMP_DEBOUNCE - (now - lastJumpTime.value));
};

/**
 * 检测是否在地面上
 */
const isOnGround = () => {
  return jumpConfig.value.position <= 1; // 使用1px容差
};

/**
 * 获取地刺的当前位置
 */
const getSpikePosition = (spike: Spike) => {
  const actualLeft = spike.initialLeft + spike.currentOffset;
  return {
    left: actualLeft,
    right: actualLeft + 50, // 地刺底边宽度约50px
    top: groundLevel.value - 50, // 地刺高度50px
    bottom: groundLevel.value
  };
};

/**
 * 持续碰撞检测
 */
const continuousCollisionCheck = () => {
  if (gameOver.value || !jumpBox.value) {
    if (collisionCheckId.value) {
      cancelAnimationFrame(collisionCheckId.value);
      collisionCheckId.value = null;
    }
    return;
  }

  // 检测碰撞
  checkCollisionWithSpikes();

  // 继续检测
  collisionCheckId.value = requestAnimationFrame(continuousCollisionCheck);
};

/**
 * 简化跳跃函数
 */
const performJump = (height: number, isAirJump: boolean = false) => {
  if (!jumpBox.value || gameOver.value) return;

  const now = Date.now();

  // 检查跳跃冷却时间
  if (now - lastJumpTime.value < JUMP_DEBOUNCE) {
    console.log('跳跃冷却中');
    return;
  }

  // 地面跳跃检查
  if (!jumpConfig.value.isJumping && !isOnGround()) {
    console.log('不在地面，不能开始新跳跃');
    return;
  }

  // 空中跳跃检查
  if (jumpConfig.value.isJumping && isAirJump) {
    if (jumpConfig.value.airJumpsRemaining <= 0) {
      console.log('没有空中跳跃次数了');
      return;
    }
    jumpConfig.value.airJumpsRemaining--;
    console.log(`空中跳跃！剩余次数: ${jumpConfig.value.airJumpsRemaining}`);
  }

  jumpConfig.value.isJumping = true;
  lastJumpTime.value = now;

  // 计算跳跃速度
  const jumpVelocity = Math.sqrt(2 * jumpConfig.value.gravity * height);

  // 如果已经在跳跃中（空中跳跃），叠加速度
  if (jumpConfig.value.isJumping && jumpConfig.value.velocity > 0) {
    jumpConfig.value.velocity += jumpVelocity * 0.6;
  } else {
    jumpConfig.value.velocity = jumpVelocity;
  }

  console.log(`开始跳跃: 高度=${height.toFixed(1)}, 速度=${jumpConfig.value.velocity.toFixed(2)}, 空中跳跃=${isAirJump}`);

  // 启动动画循环
  startJumpAnimation();
};

/**
 * 开始跳跃动画
 */
const startJumpAnimation = () => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }

  const animate = () => {
    if (!jumpBox.value || gameOver.value) {
      jumpConfig.value.isJumping = false;
      return;
    }

    // 应用重力
    jumpConfig.value.velocity -= jumpConfig.value.gravity;
    jumpConfig.value.position += jumpConfig.value.velocity;

    // 检查是否落地
    if (jumpConfig.value.position <= 0) {
      jumpConfig.value.position = 0;
      jumpConfig.value.velocity = 0;
      jumpConfig.value.isJumping = false;
      // 重置空中跳跃次数
      jumpConfig.value.airJumpsRemaining = jumpConfig.value.maxAirJumps;
      cancelAnimationFrame(animationId.value!);
      animationId.value = null;
      console.log('落地，重置空中跳跃次数');
    } else {
      // 继续动画
      animationId.value = requestAnimationFrame(animate);
    }

    updateBoxPosition();
  };

  animationId.value = requestAnimationFrame(animate);
};

/**
 * 更新方块位置
 */
const updateBoxPosition = () => {
  if (!jumpBox.value) return;

  const currentTop = initialBoxTop.value - jumpConfig.value.position;
  jumpBox.value.style.top = currentTop + 'px';

  updateBoxDebugInfo();
};

/**
 * 检测方块与地刺的碰撞
 */
const checkCollisionWithSpikes = () => {
  if (!jumpBox.value || gameOver.value) return;

  const jumpRect = jumpBox.value.getBoundingClientRect();

  // 方块底部位置
  const boxBottom = jumpRect.bottom;
  const boxTop = jumpRect.top;
  const boxLeft = jumpRect.left;
  const boxRight = jumpRect.right;

  // 如果方块离地面很远，跳过部分检测
  if (boxBottom < groundLevel.value - 150) {
    return;
  }

  // 检查所有地刺
  for (const spike of spikes.value) {
    // 计算地刺的当前位置
    const spikeLeft = spike.initialLeft + spike.currentOffset;
    const spikeRight = spikeLeft + 50; // 地刺底边宽度
    const spikeTop = groundLevel.value - 50; // 地刺高度50px
    const spikeBottom = groundLevel.value;

    // 调试信息
    if (Math.abs(boxBottom - spikeTop) < 100) {
      console.log('接近地刺:', {
        boxBottom,
        spikeTop,
        boxLeft,
        boxRight,
        spikeLeft,
        spikeRight,
        distance: Math.abs(boxBottom - spikeTop)
      });
    }

    // 简化的碰撞检测：检查方块是否在地刺上方区域内
    const horizontalOverlap = boxRight > spikeLeft + 10 && boxLeft < spikeRight - 10;
    const verticalOverlap = boxBottom >= spikeTop - 5 && boxTop <= spikeBottom + 5;

    if (horizontalOverlap && verticalOverlap) {
      console.log('碰撞检测到！', {
        boxBottom,
        spikeTop,
        boxLeft,
        boxRight,
        spikeLeft,
        spikeRight,
        horizontalOverlap,
        verticalOverlap
      });

      if (!gameOver.value) {
        gameOverAction();
      }
      return;
    }
  }
};

/**
 * 增加游戏难度
 */
const increaseDifficulty = () => {
  const minutes = Math.floor(gameTime.value / 60);

  if (minutes === 0) {
    maxSpikes.value = Math.min(initialMaxSpikes + 4, 20);
    jumpConfig.value.maxAirJumps = 3;
    jumpConfig.value.airJumpsRemaining = Math.min(jumpConfig.value.airJumpsRemaining + 1, 3);
  } else if (minutes === 1) {
    spikeSpeedMultiplier.value = 1.5;
    gameSpeed.value = 1.2;
    jumpConfig.value.maxAirJumps = 4;
    jumpConfig.value.airJumpsRemaining = Math.min(jumpConfig.value.airJumpsRemaining + 1, 4);
  } else if (minutes === 2) {
    maxSpikes.value = Math.min(maxSpikes.value + 4, 30);
    spikeSpeedMultiplier.value = 2.0;
    gameSpeed.value = 1.5;
    jumpConfig.value.maxAirJumps = 5;
    jumpConfig.value.airJumpsRemaining = Math.min(jumpConfig.value.airJumpsRemaining + 1, 5);
  } else {
    maxSpikes.value = Math.min(maxSpikes.value + 2, 40);
    spikeSpeedMultiplier.value = Math.min(spikeSpeedMultiplier.value + 0.2, 3.0);
    gameSpeed.value = Math.min(gameSpeed.value + 0.1, 2.5);
    if (minutes % 2 === 0) {
      jumpConfig.value.maxAirJumps = Math.min(jumpConfig.value.maxAirJumps + 1, 10);
      jumpConfig.value.airJumpsRemaining = jumpConfig.value.maxAirJumps;
    }
  }

  console.log(`难度提升！时间：${gameTime.value.toFixed(1)}秒，最大地刺：${maxSpikes.value}，空中跳跃：${jumpConfig.value.maxAirJumps}`);
};

/**
 * 游戏结束处理
 */
const gameOverAction = () => {
  if (gameOver.value) return;

  gameOver.value = true;
  jumpConfig.value.isJumping = false;

  console.log('游戏结束！');

  // 计算最终分数
  const timeBonus = Math.floor(gameTime.value * 10);
  const spikeBonus = Math.floor(spikes.value.length * 5);
  const airJumpBonus = Math.floor(jumpConfig.value.maxAirJumps * 20);
  score.value += timeBonus + spikeBonus + airJumpBonus;

  // 停止所有动画
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
    animationId.value = null;
  }

  if (spikeAnimationId.value) {
    cancelAnimationFrame(spikeAnimationId.value);
    spikeAnimationId.value = null;
  }

  if (collisionCheckId.value) {
    cancelAnimationFrame(collisionCheckId.value);
    collisionCheckId.value = null;
  }

  if (spawnTimeout) {
    clearTimeout(spawnTimeout);
    spawnTimeout = null;
  }

  if (difficultyTimer.value) {
    clearInterval(difficultyTimer.value);
    difficultyTimer.value = null;
  }

  // 立即显示游戏结束弹窗
  setTimeout(() => {
    showGameOverDialog.value = true;
  }, 300);
};

/**
 * 重新开始游戏
 */
const restartGame = () => {
  showGameOverDialog.value = false;

  // 重置游戏状态
  gameOver.value = false;
  gameTime.value = 0;
  score.value = 0;
  spikes.value = [];
  spikeIdCounter = 0;
  maxSpikes.value = initialMaxSpikes;
  gameSpeed.value = 1;
  spikeSpeedMultiplier.value = 1;

  // 重置跳跃参数
  jumpConfig.value.gravity = GRAVITY;
  jumpConfig.value.position = 0;
  jumpConfig.value.velocity = 0;
  jumpConfig.value.isJumping = false;
  jumpConfig.value.maxAirJumps = 2;
  jumpConfig.value.airJumpsRemaining = 2;

  updateBoxPosition();

  // 重新开始游戏
  startGame();
};

/**
 * 退出游戏
 */
const quitGame = () => {
  showGameOverDialog.value = false;
  stopGame();
  alert("游戏已退出！");
};

/**
 * 开始游戏
 */
const startGame = () => {
  calculateInitialPosition();
  updateBoxPosition();

  gameStartTime.value = Date.now();

  // 开始更新游戏时间
  const updateGameTime = () => {
    if (!gameOver.value) {
      gameTime.value = (Date.now() - gameStartTime.value) / 1000;
      requestAnimationFrame(updateGameTime);
    }
  };
  requestAnimationFrame(updateGameTime);

  // 开始地刺移动
  lastUpdateTime = Date.now();
  spikeAnimationId.value = requestAnimationFrame(moveSpikes);

  // 开始持续碰撞检测
  continuousCollisionCheck();

  // 开始生成地刺
  spawnSpike();

  // 开始难度提升计时器
  difficultyTimer.value = window.setInterval(() => {
    if (!gameOver.value) {
      increaseDifficulty();
    }
  }, DIFFICULTY_INCREASE_INTERVAL * 1000);

  console.log('游戏开始！');
};

/**
 * 手动点击跳跃（测试用）
 */
const manualJump = () => {
  if (gameOver.value) return;
  console.log('手动点击跳跃');
  performJump(MAX_JUMP_HEIGHT, false);
};

// ==================== 麦克风响度监听 ====================
watch(
  () => mic.level.value,
  (level) => {
    if (gameOver.value || !isActive.value) return;

    const now = Date.now();

    // 检查是否超过声音阈值
    if (level > SOUND_THRESHOLD) {
      console.log(`检测到声音: ${level.toFixed(3)} (阈值: ${SOUND_THRESHOLD})`);

      // 检查跳跃冷却
      if (now - lastJumpTime.value < JUMP_DEBOUNCE) {
        console.log(`跳跃冷却中，还需${JUMP_DEBOUNCE - (now - lastJumpTime.value)}ms`);
        return;
      }

      // 确定跳跃类型和高度
      const isAirJump = jumpConfig.value.isJumping;
      let jumpHeight = level * MAX_JUMP_HEIGHT * 2.5;

      // 空中跳跃高度降低
      if (isAirJump) {
        jumpHeight *= 0.7;
      }

      // 确保最小跳跃高度
      jumpHeight = Math.max(50, jumpHeight);

      console.log(`触发跳跃: 高度=${jumpHeight.toFixed(1)}, 类型=${isAirJump ? '空中' : '地面'}`);

      // 执行跳跃
      performJump(jumpHeight, isAirJump);
    }
  },
  { immediate: true }
);

// ==================== 生命周期钩子 ====================
onMounted(() => {
  console.log('组件挂载');
  nextTick(() => {
    startGame();
  });

  window.addEventListener("resize", () => {
    calculateInitialPosition();
    updateBoxPosition();
  });
});

onUnmounted(() => {
  mic.cleanup();
  stopGame();
  window.removeEventListener("resize", calculateInitialPosition);
});

/**
 * 停止游戏
 */
const stopGame = () => {
  if (spawnTimeout) {
    clearTimeout(spawnTimeout);
    spawnTimeout = null;
  }

  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
    animationId.value = null;
  }

  if (spikeAnimationId.value) {
    cancelAnimationFrame(spikeAnimationId.value);
    spikeAnimationId.value = null;
  }

  if (collisionCheckId.value) {
    cancelAnimationFrame(collisionCheckId.value);
    collisionCheckId.value = null;
  }

  if (difficultyTimer.value) {
    clearInterval(difficultyTimer.value);
    difficultyTimer.value = null;
  }

  spikes.value = [];
  gameOver.value = false;
  showGameOverDialog.value = false;

  console.log('游戏停止');
};
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100vh;
  position: relative;
  background: linear-gradient(180deg, #87ceeb 0%, #e0f6ff 100%);
  overflow: hidden;
}

.jump-box {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  position: fixed;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 20;
  transition: top 0.05s linear;
  left: 50%;
  transform: translateX(-50%);
  top: calc(100vh - 200px);
}

.jump-box:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  transform: translateX(-50%) scale(1.02);
}

/* 地面 */
.ground {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(180deg, #90ee90 0%, #228b22 100%);
  border-top: 3px solid #1a6b1a;
  z-index: 10;
  overflow: visible;
}

/* 地刺样式 */
.spike {
  position: absolute;
  bottom: 100%;
  width: 0;
  height: 0;
  border-left: 25px solid transparent;
  border-right: 25px solid transparent;
  border-bottom: 50px solid #ff4444;
  filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3));
  z-index: 15;
  transition: transform 0.05s linear;
}

/* 游戏结束弹窗 */
.game-over-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  min-width: 300px;
  max-width: 400px;
}

.dialog-content h3 {
  color: #ff4444;
  font-size: 28px;
  margin-bottom: 20px;
}

.dialog-content p {
  font-size: 18px;
  color: #666;
  margin-bottom: 15px;
}

.score {
  font-size: 24px;
  font-weight: bold;
  color: #9b59b6;
  margin: 20px 0;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #9b59b6;
}

.dialog-buttons {
  display: flex;
  gap: 20px;
  margin-top: 30px;
  justify-content: center;
}

.dialog-buttons button {
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 120px;
}

.restart-btn {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
}

.restart-btn:hover {
  background: linear-gradient(135deg, #8e44ad, #9b59b6);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(142, 68, 173, 0.4);
}

.quit-btn {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
}

.quit-btn:hover {
  background: linear-gradient(135deg, #ee5a52, #ff6b6b);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(238, 90, 82, 0.4);
}

/* 游戏信息面板 */
.game-info {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px;
  border-radius: 10px;
  font-family: 'Arial', sans-serif;
  z-index: 50;
  min-width: 200px;
}

.info-item {
  margin: 5px 0;
  font-size: 14px;
  font-weight: bold;
}

.info-item:nth-child(1) { color: #3498db; }
.info-item:nth-child(2) { color: #2ecc71; }
.info-item:nth-child(3) { color: #e74c3c; }
.info-item:nth-child(4) { color: #f39c12; }
.info-item:nth-child(5) { color: #9b59b6; }
.info-item:nth-child(6) { color: #1abc9c; }
.info-item:nth-child(7) { color: #e67e22; }

/* 调试信息 */
.debug-info {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  font-size: 12px;
  z-index: 100;
}

.debug-info div {
  margin: 2px 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .jump-box {
    width: 80px;
    height: 80px;
  }

  .spike {
    border-left: 20px solid transparent;
    border-right: 20px transparent;
    border-bottom: 40px solid #ff4444;
  }

  .dialog-content {
    padding: 30px 20px;
    margin: 20px;
  }

  .dialog-buttons {
    flex-direction: column;
    gap: 10px;
  }

  .game-info {
    top: 10px;
    right: 10px;
    padding: 10px;
    font-size: 12px;
    min-width: 160px;
  }

  .info-item {
    font-size: 12px;
    margin: 4px 0;
  }
}
</style>

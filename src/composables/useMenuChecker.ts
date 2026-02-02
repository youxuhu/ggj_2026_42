import { ref, computed, watch, onMounted, onUnmounted, toRef } from 'vue';
import { menuGroups, customerOrders, type MenuGroup, type CustomerOrder } from '../stores/gameStore';

interface UseMenuCheckerProps {
  menuId?: string;
  orderId?: string;
}

// 配置：压力条与惩奖
const PRESSURE_MAX = 100;
const PRESSURE_GAIN_PER_SEC = 1; // 基础匀速变化（正为涨，负为降）
const PRESSURE_PENALTY_WRONG = 20; // 答错增加
const PRESSURE_REWARD_CORRECT = 15; // 答对减少
const TICK_MS = 200; // 定时器节拍

// 使用 gameStore 中的菜单与顾客数据，避免重复维护

export function useMenuChecker(props: UseMenuCheckerProps) {
  const menuId = toRef(props, 'menuId');
  const orderId = toRef(props, 'orderId');

  const selectedItemIds = ref<number[]>([]);
  const feedback = ref<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const pressure = ref(0);
  const completedOrderIds = ref<string[]>([]);
  const gameState = ref<'playing' | 'success' | 'failure'>('playing');
  const staffMood = ref<'happy' | 'lazy'>('happy');
  const timerId = ref<number | undefined>(undefined);
  const currentMenuId = ref(menuId.value || 'sichuan');

  const currentOrder = computed<CustomerOrder>(() => {
    const order = customerOrders.find(c => c.id === orderId.value);
    return order || customerOrders[0]!;
  });

  const currentGroup = computed<MenuGroup>(() => {
    const group = menuGroups.find(g => g.id === currentMenuId.value);
    return group || menuGroups[0]!;
  });

  const pressurePercent = computed(() => Math.min(100, Math.max(0, Math.round((pressure.value / PRESSURE_MAX) * 100))));
  const completedCount = computed(() => completedOrderIds.value.length);
  const pressureRatePerSec = computed(() => staffMood.value === 'happy' ? PRESSURE_GAIN_PER_SEC : -PRESSURE_GAIN_PER_SEC);

  watch(() => currentOrder.value?.id, () => {
    selectedItemIds.value = [];
    feedback.value = { message: '', type: '' };
  });

  const stopTimer = () => {
    if (timerId.value !== undefined) {
      clearInterval(timerId.value);
      timerId.value = undefined;
    }
  };

  const adjustPressure = (delta: number) => {
    const next = Math.min(PRESSURE_MAX, Math.max(0, pressure.value + delta));
    pressure.value = next;
    if (next >= PRESSURE_MAX && gameState.value === 'playing') {
      gameState.value = 'failure';
      feedback.value = { message: '压力爆表，游戏失败。', type: 'error' };
      stopTimer();
    }
  };

  const startTimer = () => {
    stopTimer();
    timerId.value = window.setInterval(() => {
      if (gameState.value !== 'playing') return;
      adjustPressure((pressureRatePerSec.value * TICK_MS) / 1000);
    }, TICK_MS);
  };

  onMounted(() => startTimer());
  onUnmounted(() => stopTimer());

  const toggleSelection = (id: number) => {
    if (feedback.value.type === 'success') return;
    if (gameState.value !== 'playing') return;

    const index = selectedItemIds.value.indexOf(id);
    if (index === -1) {
      selectedItemIds.value.push(id);
    } else {
      selectedItemIds.value.splice(index, 1);
    }
    if (feedback.value.type === 'error') {
      feedback.value = { message: '', type: '' };
    }
  };

  const submitOrder = () => {
    if (gameState.value !== 'playing') return;
    if (!currentOrder.value) return;

    const correctIds = currentOrder.value.targetIds;

    const isCorrectCount = selectedItemIds.value.length === correctIds.length;
    const isAllMatches = selectedItemIds.value.every(id => correctIds.includes(id));

    if (isCorrectCount && isAllMatches) {
      if (!completedOrderIds.value.includes(currentOrder.value.id)) {
        completedOrderIds.value.push(currentOrder.value.id);
      }

      adjustPressure(-PRESSURE_REWARD_CORRECT);

      const allDone = completedOrderIds.value.length === customerOrders.length;
      if (allDone) {
        gameState.value = 'success';
        feedback.value = { message: '所有顾客都满意，闯关成功！', type: 'success' };
        stopTimer();
      } else {
        feedback.value = { message: `回答正确！${currentOrder.value.name} 非常满意。`, type: 'success' };
      }
    } else {
      adjustPressure(PRESSURE_PENALTY_WRONG);
      feedback.value = { message: '回答错误，请核对顾客需求。', type: 'error' };
    }
  };

  const switchMenu = (menuIdValue: string) => {
    currentMenuId.value = menuIdValue;
  };

  return {
    // data
    menuGroups,
    customerOrders,
    selectedItemIds,
    feedback,
    pressure,
    pressurePercent,
    completedOrderIds,
    completedCount,
    gameState,
    staffMood,
    currentOrder,
    currentGroup,
    // methods
    toggleSelection,
    submitOrder,
    switchMenu,
  };
}

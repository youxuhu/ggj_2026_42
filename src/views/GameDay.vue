<template>
  <div class="game-view">
    <el-container class="game-view__board" style="background-color: #55051b">
      <el-header class="game-view__header">
        <img src="/pic/header.png" alt="" />
      </el-header>
      <el-container class="game-view__content">
        <el-aside class="sidebar">
          <div class="sidebar__custom" style="margin: 10px">
            <div class="player-frame" ref="playerFrameRef">
              <!-- border -->
              <img src="/pic/border1.png" alt="" class="player-border-img" />
              <!-- playerpic -->
              <img :src="customerImage" alt="" class="player-bg-img" />
            </div>
          </div>

          <div class="sidebar__order" style="margin: 10px">
            <div class="dialogue-frame">
              <img src="/pic/border2.png" alt="" class="dialogue-border" />
              <div class="dialogue-content" style="padding: 10px; margin: 10px">
                <DialogueBox />
              </div>
            </div>
          </div>
        </el-aside>
        <el-main class="player-area" ref="playerAreaRef">
          <el-container>
            <el-aside class="player-menu" style="margin: 10px">
              <MenuChecker />
            </el-aside>
            <el-container>
              <el-header class="player-area__header">
                <div
                  class="player-frame"
                  ref="playerFrameRef"
                  style="margin: 10px"
                >
                  <!-- border -->
                  <img
                    src="/pic/border1.png"
                    alt=""
                    class="player-border-img"
                  />
                  <!-- playerpic -->
                  <img :src="employeeImage" alt="" class="player-bg-img" />
                </div>
              </el-header>
              <el-main class="player-area__persona">
                <!-- 员工状态和压力条合并模块 -->
                <GameStatus />
              </el-main>
            </el-container>
          </el-container>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts" name="Game">
import DialogueBox from "@/components/DialogueBox.vue";
import GameStatus from "@/components/GameStatus.vue";
import MenuChecker from "@/components/MenuChecker.vue";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  customerScheduleByDay,
  useGameStore,
  type DayKey,
  type EmployeeStatus,
} from "../stores/gameStore";

const store = useGameStore();
const { currentOrderId, gameState, pressure, staffMood, completedOrderIds } =
  storeToRefs(store);
const route = useRoute();
const router = useRouter();

const playerFrameRef = ref<HTMLElement | null>(null);
const playerAreaRef = ref<HTMLElement | null>(null);
let playerFrameObserver: ResizeObserver | null = null;

const staffMoodImageMap: Record<EmployeeStatus, string> = {
  smile: "/pic/mianju1.png",
  slacking: "/pic/mianju2.png",
  parenting: "/pic/mianju3.png",
  patient: "/pic/mianju4.png",
  invisible: "/pic/mianju5.png",
};

const customerImage = computed(() => {
  return store.currentOrder.customerImage || "/pic/cateen.png";
});

const employeeImage = computed(() => {
  return staffMoodImageMap[staffMood.value] || "/pic/playerbg.png";
});

const getDomEl = (el: HTMLElement | { $el?: HTMLElement } | null) => {
  if (!el) return null;
  return "$el" in el && el.$el ? el.$el : (el as HTMLElement);
};

const dayKey = computed<DayKey>(() => {
  const param = String(route.params.dayIndex ?? "1");
  const numParam = parseInt(param);
  if (numParam === 2) return "day2";
  if (numParam === 3) return "day3";
  return "day1";
});

const dayOrders = computed(() => customerScheduleByDay[dayKey.value] ?? []);
const hasDayFinished = ref(false);
const hasGameOverRedirect = ref(false);

const setDayFirstOrder = () => {
  const first = dayOrders.value[0];
  if (first) {
    store.setOrderId(first.id);
  }
};

onMounted(() => {
  store.startTimer();
  setDayFirstOrder();

  const frameEl = getDomEl(playerFrameRef.value);
  const areaEl = getDomEl(playerAreaRef.value as unknown as HTMLElement);

  if (frameEl && areaEl) {
    const syncFrameHeight = () => {
      const height = frameEl.clientHeight ?? 0;
      areaEl.style.setProperty(
        "--player-frame-height",
        height > 0 ? `${height}px` : "auto",
      );
    };

    syncFrameHeight();
    playerFrameObserver = new ResizeObserver(syncFrameHeight);
    playerFrameObserver.observe(frameEl);
  }
});

onBeforeUnmount(() => {
  playerFrameObserver?.disconnect();
  playerFrameObserver = null;
});

// 监听路由参数变化，重置状态
watch(
  () => route.params.dayIndex,
  () => {
    setDayFirstOrder();
    hasDayFinished.value = false;
    hasGameOverRedirect.value = false;
  },
  { immediate: true },
);

// 监听压力值，如果满了就跳转到 HomeView
watch(
  () => ({ pressure: pressure.value, gameState: gameState.value }),
  ({ pressure: newPressure, gameState: newGameState }) => {
    if (hasGameOverRedirect.value) return;
    if (newPressure >= 100 || newGameState === "failure") {
      hasGameOverRedirect.value = true;
      store.resetPressure();
      router.push("/gameover");
    }
  },
);

// 监听游戏状态和完成的顾客，判断是否完成所有顾客
watch(
  () => ({
    gameState: gameState.value,
    completedOrderIds: [...completedOrderIds.value],
    dayOrders: dayOrders.value,
  }),
  (state) => {
    // 已经处理过跳转，不再处理
    if (hasDayFinished.value) {
      return;
    }
    // 使用基于路由参数的 dayOrders 来判断当天订单是否全部完成
    const dayOrderIds = state.dayOrders.map((order) => order.id);
    const allDone =
      dayOrderIds.length > 0 &&
      dayOrderIds.every((id) => state.completedOrderIds.includes(id));

    if (allDone) {
      hasDayFinished.value = true;
      // 已完成当天所有顾客，跳转到下一个晚上
      goToNextNight();
    }
  },
  { deep: true, immediate: true },
);

const goToNextNight = () => {
  // 从当前的白天跳转到下一个晚上
  // 场景序列：N1, T1, D1, N2, T2, D2, N3, T3, D3, N4
  // 白天结束,清空压力值
  store.resetPressure();
  store.stopTimer();

  const currentDayNum = parseInt(route.params.dayIndex as string) || 1;

  // 白天1完成 -> 晚上2
  // 白天2完成 -> 晚上3
  // 白天3完成 -> 晚上4
  const nextNightIndex = currentDayNum + 1;

  if (nextNightIndex <= 4) {
    router.push(`/game/night/${nextNightIndex}`);
  }
};
</script>

<style scoped>
:global(html, body, #app) {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.game-view {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #24030c;
  overflow: hidden;
}

.game-view__board {
  height: auto;
  width: fit-content;
  aspect-ratio: auto;
  overflow: hidden;
  flex: none;
  max-width: 100%;
}

.game-view__header {
  height: auto;
  width: auto;
  padding: 0px;
}

.game-view__content {
  height: auto;
  overflow: hidden;
  width: fit-content;
  max-width: 100%;
}

.sidebar {
  width: fit-content;
  height: auto;
  overflow: hidden;
  max-width: 100%;
}

.sidebar__custom {
  width: 100%;
  height: auto;
  background-color: orange;
  overflow: hidden;
}

.sidebar__order {
  width: 100%;
  height: auto;
  background-color: #55051b;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.dialogue-frame {
  position: relative;
  width: 100%;
  height: auto;
  overflow: hidden;
  isolation: isolate;
}

.dialogue-border {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.dialogue-content {
  position: relative;
  width: auto;
  overflow: hidden;
  z-index: 1;
}

.player-area {
  /* background-color: cyan; */
  display: flex;
  padding: 0;
  height: auto;
  overflow: hidden;
  margin: 0;
  --player-frame-width: 400px;
  --player-frame-max: 450px;
  /* --player-frame-height: 316px; */
  width: fit-content;
  max-width: 100%;
}

.player-menu {
  width: fit-content;
  display: flex;
  justify-content: center;
  align-items: center;
  height: auto;
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
  max-width: 100%;
}

.player-area__header {
  height: auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0;
  margin: 0;
  width: var(--player-frame-width);
  max-width: var(--player-frame-max);
  height: var(--player-frame-height);
}

.player-area__header.el-header {
  height: auto;
  min-height: 0;
  padding: 0;
}

.player-frame {
  position: relative;
  width: var(--player-frame-width);
  max-width: var(--player-frame-max);
  height: var(--player-frame-height);
  overflow: hidden;
  isolation: isolate;
  margin: 0;
  contain: paint;
}

.player-bg-img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate(-50%, -50%) scale(1.15);
  z-index: 1;
  display: block;
  pointer-events: none;
}

.player-border-img {
  position: relative;
  width: 100%;
  height: auto;
  z-index: 2;
  display: block;
  pointer-events: none;
  margin: 0;
}

.pborder {
  margin: 0;
}

.player-area__persona {
  display: flex;
  width: 385px;
  max-width: 400px;
  /* flex: 1; */
  overflow: hidden;
  padding: 0;
  /* margin: 10px; */
}

.sidebar__custom,
.sidebar__order,
.player-menu,
.player-area__persona {
  display: flex;
}

.sidebar__custom :deep(> *),
.sidebar__order :deep(> *),
.player-menu :deep(> *),
.player-area__persona :deep(> *) {
  width: 100%;
  height: 100%;
}
</style>

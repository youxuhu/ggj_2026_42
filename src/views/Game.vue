<template>
  <div class="game-container">
    <!-- 根据路由动态显示GameNight或GameDay -->
    <Transition name="scene-fade" mode="out-in">
      <component :is="currentComponent" :key="componentKey" />
    </Transition>
  </div>
</template>

<script setup lang="ts" name="Game">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import GameDay from "./GameDay.vue";
import GameNight from "./GameNight.vue";
import GameTransition from "./GameTransition.vue";

const route = useRoute();
const router = useRouter();

// 场景序列：N1, T1, D1, N2, T2, D2, N3, T3, D3, N4
// 总共 10 个场景：4个夜晚，3个白天，3个过渡
const scenes = [
  { type: "night", index: 1 },
  { type: "transition", index: 1 },
  { type: "day", index: 1 },
  { type: "night", index: 2 },
  { type: "transition", index: 2 },
  { type: "day", index: 2 },
  { type: "night", index: 3 },
  { type: "transition", index: 3 },
  { type: "day", index: 3 },
  { type: "night", index: 4 },
];

// 根据路由参数确定当前场景
const currentSceneIndex = computed(() => {
  const nightIndex = route.params.nightIndex;
  const dayIndex = route.params.dayIndex;
  const transitionIndex = route.params.transitionIndex;

  if (nightIndex) {
    const index = parseInt(nightIndex as string);
    return scenes.findIndex((s) => s.type === "night" && s.index === index);
  } else if (dayIndex) {
    const index = parseInt(dayIndex as string);
    return scenes.findIndex((s) => s.type === "day" && s.index === index);
  } else if (transitionIndex) {
    const index = parseInt(transitionIndex as string);
    return scenes.findIndex(
      (s) => s.type === "transition" && s.index === index,
    );
  }
  return 0; // 默认第一个夜晚
});

const componentKey = ref(0);

const currentComponent = computed(() => {
  const idx = currentSceneIndex.value;
  if (idx >= 0 && idx < scenes.length) {
    const scene = scenes[idx]!;
    if (scene.type === "night") return GameNight;
    if (scene.type === "day") return GameDay;
    return GameTransition;
  }
  return GameNight;
});

const goToNextScene = () => {
  const idx = currentSceneIndex.value;
  if (idx < scenes.length - 1) {
    const nextScene = scenes[idx + 1]!;
    if (nextScene.type === "night") {
      router.push(`/game/night/${nextScene.index}`);
    } else if (nextScene.type === "day") {
      router.push(`/game/day/${nextScene.index}`);
    } else {
      router.push(`/game/transition/${nextScene.index}`);
    }
  }
};

const goToPreviousScene = () => {
  const idx = currentSceneIndex.value;
  if (idx > 0) {
    const prevScene = scenes[idx - 1]!;
    if (prevScene.type === "night") {
      router.push(`/game/night/${prevScene.index}`);
    } else if (prevScene.type === "day") {
      router.push(`/game/day/${prevScene.index}`);
    } else {
      router.push(`/game/transition/${prevScene.index}`);
    }
  }
};

// 监听路由变化，更新组件key以强制重新渲染
watch(
  () => route.params,
  () => {
    componentKey.value++;
  },
);

// 暴露方法给子组件使用
defineExpose({
  goToNextScene,
  goToPreviousScene,
  currentSceneIndex,
  scenes,
});
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
}

/* 场景切换过渡效果 */
.scene-fade-enter-active,
.scene-fade-leave-active {
  transition: opacity 0.4s ease;
}

.scene-fade-enter-from,
.scene-fade-leave-to {
  opacity: 0;
}
</style>

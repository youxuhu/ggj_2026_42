<template>
  <div class="transition-view" @click="goToDay">
    <div class="transition-view__text">第{{ dayIndex }}个白天</div>
    <div class="transition-view__tip">点击继续</div>
  </div>
</template>

<script setup lang="ts" name="GameTransition">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const dayIndex = computed(() => {
  const idx = parseInt(route.params.transitionIndex as string);
  return Number.isNaN(idx) || idx <= 0 ? 1 : idx;
});

const goToDay = () => {
  router.push(`/game/day/${dayIndex.value}`);
};
</script>

<style scoped>
.transition-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background-color: #000;
  color: #fff;
  user-select: none;
  cursor: pointer;
}

.transition-view__text {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
}

.transition-view__tip {
  font-size: 14px;
  opacity: 0.7;
}
</style>

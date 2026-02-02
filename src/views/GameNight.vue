<template>
  <div class="game-view" @click="handleDialogueNext">
    <div class="game-view__board">
      <el-container class="container">
        <el-aside class="phone">
          <div class="phone__dialogue">
            <transition-group name="bubble" tag="div" class="dialogue-list">
              <div
                v-for="(talk, index) in visibleTalks"
                :key="index"
                :class="['dialogue-wrapper', `dialogue-wrapper--${talk.id}`]"
              >
                <div class="avatar" :class="`avatar--${talk.id}`">
                  {{ talk.id }}
                </div>
                <div
                  :class="['dialogue-bubble', `dialogue-bubble--${talk.id}`]"
                >
                  {{ talk.talk }}
                </div>
              </div>
            </transition-group>
          </div>
        </el-aside>
        <el-main class="pic">
          <img src="../pic/night.png" alt="" />
        </el-main>
      </el-container>
    </div>
  </div>
</template>

<!-- 使用方法实例 -->

<!-- <GameNight day="day1" />
<GameNight day="day2" />
<GameNight day="day3" />
router.push({ name: 'GameNight', query: { day: 'day2' } })
import { useRoute } from 'vue-router';

const route = useRoute();
const currentDay = ref(route.query.day as string || "day1");
-->

<script setup lang="ts" name="Night">
import { useTalkStore } from "@/stores/talks";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps<{
  day?: string;
}>();

const talkStore = useTalkStore();
const router = useRouter();
const route = useRoute();
const displayCount = ref(0);

// 监听路由变化，重置 displayCount
watch(
  () => route.params.nightIndex,
  () => {
    displayCount.value = 0;
  },
  { immediate: true },
);

// 根据nightIndex映射到对应的day: night1->day0, night2->day1, night3->day2, night4->day3
const currentDay = computed(() => {
  const nightIndex = parseInt(route.params.nightIndex as string) || 1;
  const dayIndex = nightIndex - 1;
  return `day${dayIndex}`;
});

const talkList = computed(() => {
  return talkStore.getTalksByDay(currentDay.value);
});

const visibleTalks = computed(() => {
  return talkList.value.slice(0, displayCount.value);
});

const isAllDisplayed = computed(() => {
  // 如果没有对话数据，也认为已经显示完成
  if (talkList.value.length === 0) return true;
  return displayCount.value >= talkList.value.length;
});

const handleDialogueNext = () => {
  // 如果没有对话或已经显示完所有对话，跳转到下一场景
  if (
    talkList.value.length === 0 ||
    displayCount.value >= talkList.value.length
  ) {
    goToNextScene();
    return;
  }
  // 否则显示下一条对话
  displayCount.value++;
};

const goToNextScene = () => {
  // 获取当前夜晚的索引
  const nightIndex = route.params.nightIndex as string;
  const currentNightNum = parseInt(nightIndex) || 1;

  // 场景序列中找到当前位置
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

  const currentSceneIndex = scenes.findIndex(
    (s) => s.type === "night" && s.index === currentNightNum,
  );

  if (currentSceneIndex >= 0 && currentSceneIndex < scenes.length - 1) {
    const nextScene = scenes[currentSceneIndex + 1]!;
    if (nextScene.type === "transition") {
      router.push(`/game/transition/${nextScene.index}`);
      return;
    }
    if (nextScene.type === "night") {
      router.push(`/game/night/${nextScene.index}`);
      return;
    }
    router.push(`/game/day/${nextScene.index}`);
    return;
  }

  if (currentSceneIndex === scenes.length - 1) {
    router.push("/end");
  }
};
</script>

<style scoped>
* {
  padding: 0px;
  margin: 0px;
}

.game-view {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #090d1f;
  user-select: none;
  cursor: pointer;
}

.game-view__board {
  height: 80%;
  width: 80%;
  aspect-ratio: 1;
}

.container {
  height: 100%;
  width: 100%;
}

.pic {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
}

.pic img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.phone {
  /* background-color: orange; */
  width: 35%;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-image: url("/public/pic/phone.png");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.phone__dialogue {
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 15px 12px 15px 20px;
  margin: 25% auto;
  width: 75%;
  box-sizing: border-box;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.phone__dialogue::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.dialogue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.dialogue-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.dialogue-wrapper--1 {
  flex-direction: row-reverse;
  justify-content: flex-start;
  margin-left: auto;
}

.dialogue-wrapper--2 {
  flex-direction: row;
  justify-content: flex-start;
}

.dialogue-wrapper--Su {
  flex-direction: row-reverse;
  justify-content: flex-start;
  margin-left: auto;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 11px;
  color: white;
}

.avatar--1 {
  background-color: #4caf50;
}

.avatar--2 {
  background-color: #e91e63;
}

.avatar--Su {
  background-color: #4caf50;
}

.avatar--妈妈 {
  background-color: #ff9800;
}

.avatar--爸爸 {
  background-color: #607d8b;
}

.avatar--老员工 {
  background-color: #9c27b0;
}

.avatar--店长 {
  background-color: #3f51b5;
}

.avatar--无敌暴龙战士 {
  background-color: #f44336;
}

.avatar--系统 {
  background-color: #9e9e9e;
}

.dialogue-bubble {
  /* 修改气泡的最大宽度！！！！ */
  max-width: 75%;
  padding: 8px 12px;
  border-radius: 8px;
  word-wrap: break-word;
  word-break: break-all;
  color: #000;
  font-size: 12px;
  line-height: 1.3;
  text-align: left;
}

.dialogue-bubble--1 {
  align-self: flex-end;
  background-color: #c8e6c9;
}

.dialogue-bubble--2 {
  align-self: flex-start;
  background-color: #f8bbd0;
}

.dialogue-bubble--Su {
  align-self: flex-end;
  background-color: #c8e6c9;
}

.dialogue-bubble--妈妈,
.dialogue-bubble--爸爸,
.dialogue-bubble--老员工,
.dialogue-bubble--店长,
.dialogue-bubble--无敌暴龙战士,
.dialogue-bubble--系统 {
  align-self: flex-start;
}

.dialogue-bubble--妈妈 {
  background-color: #ffe0b2;
}

.dialogue-bubble--爸爸 {
  background-color: #cfd8dc;
}

.dialogue-bubble--老员工 {
  background-color: #e1bee7;
}

.dialogue-bubble--店长 {
  background-color: #c5cae9;
}

.dialogue-bubble--无敌暴龙战士 {
  background-color: #ffcdd2;
}

.dialogue-bubble--系统 {
  background-color: #e0e0e0;
}

/* 从顶部外侧进入动画 */
.bubble-enter-active {
  animation: bubble-from-top 0.5s ease-out;
}

@keyframes bubble-from-top {
  0% {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  60% {
    transform: translateY(5px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 微信风格输入框 */
.keyboard {
  width: 100%;
  background-color: #f7f7f7;
  border-top: 1px solid #e5e5e5;
  padding: 8px 10px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.keyboard__input-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.keyboard__voice-btn,
.keyboard__emoji-btn,
.keyboard__more-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  transition: background-color 0.2s;
  border-radius: 4px;
}

.keyboard__voice-btn:hover,
.keyboard__emoji-btn:hover,
.keyboard__more-btn:hover {
  background-color: #e5e5e5;
}

.keyboard__input {
  flex: 1;
  height: 36px;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.keyboard__input:focus {
  border-color: #07c160;
}

.keyboard__input::placeholder {
  color: #999;
}
</style>

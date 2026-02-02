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
          <div class="keyboard">
            <div class="keyboard__input-area">
              <button class="keyboard__voice-btn">
                <span>🎤</span>
              </button>
              <input
                type="text"
                class="keyboard__input"
                placeholder="发送消息..."
              />
              <button class="keyboard__emoji-btn">
                <span>😊</span>
              </button>
              <button class="keyboard__more-btn">
                <span>+</span>
              </button>
            </div>
          </div>
        </el-aside>
        <el-main class="pic">立绘</el-main>
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
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps<{
  day?: string;
}>();

const talkStore = useTalkStore();
const router = useRouter();
const route = useRoute();
const currentDay = ref(props.day || "day1");
const displayCount = ref(0);

const talkList = computed(() => {
  return talkStore.getTalksByDay(currentDay.value);
});

const visibleTalks = computed(() => {
  return talkList.value.slice(0, displayCount.value);
});

const isAllDisplayed = computed(() => {
  return (
    displayCount.value >= talkList.value.length && talkList.value.length > 0
  );
});

const handleDialogueNext = () => {
  if (displayCount.value < talkList.value.length) {
    displayCount.value++;
  } else if (isAllDisplayed.value) {
    // 所有文本已显示，点击跳转到下一场景
    goToNextScene();
  }
};

const goToNextScene = () => {
  // 获取当前夜晚的索引
  const nightIndex = route.params.nightIndex as string;
  const currentNightNum = parseInt(nightIndex) || 1;

  // 场景序列中找到当前位置
  const scenes = [
    { type: "night", index: 1 },
    { type: "day", index: 1 },
    { type: "night", index: 2 },
    { type: "day", index: 2 },
    { type: "night", index: 3 },
    { type: "day", index: 3 },
    { type: "night", index: 4 },
  ];

  const currentSceneIndex = scenes.findIndex(
    (s) => s.type === "night" && s.index === currentNightNum,
  );

  if (currentSceneIndex >= 0 && currentSceneIndex < scenes.length - 1) {
    const nextScene = scenes[currentSceneIndex + 1]!;
    const path =
      nextScene.type === "night"
        ? `/game/night/${nextScene.index}`
        : `/game/day/${nextScene.index}`;
    router.push(path);
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
  background-color: #f0f0f0;
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

.phone {
  background-color: orange;
  width: 35%;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.phone__dialogue {
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 10px;
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
  gap: 12px;
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
}

.dialogue-wrapper--2 {
  flex-direction: row;
  justify-content: flex-start;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: white;
}

.avatar--1 {
  background-color: #4caf50;
}

.avatar--2 {
  background-color: #e91e63;
}

.dialogue-bubble {
  /* 修改气泡的最大宽度！！！！ */
  max-width: 75%;
  padding: 10px 15px;
  border-radius: 10px;
  word-wrap: break-word;
  word-break: break-all;
  color: #000;
  font-size: 14px;
  line-height: 1.4;
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

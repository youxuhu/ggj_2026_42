<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useGameStore } from "../stores/gameStore";

const store = useGameStore();
const {
  dialogueLine,
  rememberedNotes,
  isDialoguePhase,
  isLastDialogueLine,
  feedback,
} = storeToRefs(store);
const { advanceDialogue } = store;

const displaySpeaker = computed(() => {
  if (isDialoguePhase.value && dialogueLine.value) {
    return dialogueLine.value.speaker;
  }
  return "Suda";
});

const displayText = computed(() => {
  if (isDialoguePhase.value && dialogueLine.value) {
    return dialogueLine.value.text;
  }
  return rememberedNotes.value || "目前没有顾客，稍等片刻。";
});

const typedText = ref("");
let typingTimer: number | null = null;

const startTyping = (text: string) => {
  if (typingTimer !== null) {
    window.clearInterval(typingTimer);
  }
  typedText.value = "";
  if (!text) return;

  let index = 0;
  typingTimer = window.setInterval(() => {
    typedText.value += text.charAt(index);
    index += 1;
    if (index >= text.length && typingTimer !== null) {
      window.clearInterval(typingTimer);
      typingTimer = null;
    }
  }, 30);
};

watch(
  () => displayText.value,
  (text) => {
    startTyping(text);
  },
  { immediate: true },
);

const handleAdvance = () => {
  if (!isDialoguePhase.value) return;
  advanceDialogue();
};

onBeforeUnmount(() => {
  if (typingTimer !== null) {
    window.clearInterval(typingTimer);
  }
});
</script>

<template>
  <div
    class="dialogue-box px-text"
    :class="{ clickable: isDialoguePhase }"
    @click="handleAdvance"
  >
    <div class="dialogue-content">
      <span class="speaker">{{ displaySpeaker }}:</span>
      <p class="text">{{ typedText }}</p>
    </div>
    <div
      v-if="
        feedback.message ||
        isLastDialogueLine ||
        !isDialoguePhase ||
        (isDialoguePhase && !isLastDialogueLine)
      "
      class="notes-hint"
    >
      <span v-if="feedback.message" :class="['feedback-msg', feedback.type]">
        {{ feedback.message }}
      </span>
      <span v-else-if="isDialoguePhase && !isLastDialogueLine">
        顾客还在描述需求，先把对话听完哦。
      </span>
      <span v-else>记录完毕，按笔记执行订单。</span>
    </div>
  </div>
</template>

<style scoped>
.dialogue-box {
  width: var(--dialogue-width, 360px);
  height: var(--dialogue-height, 200px);
  max-width: none;
  background: #55051b;
  /* border: 2px solid #3a3a3a; */
  /* border-radius: 10px; */
  padding: 16px 24px;
  color: #f7f7f7;
  /* box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35); */
  display: block;
  box-sizing: border-box;
}

.dialogue-box.clickable {
  cursor: pointer;
}

.dialogue-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.speaker {
  color: #f6bd60;
  font-size: 1.2em;
}

.text {
  margin: 0;
  font-size: 1.2em;
  line-height: 1.5;
}

.notes-hint {
  font-size: 1em;
  color: #9e9e9e;
  margin-top: 10px; /* Add some space if needed */
}

.feedback-msg.success {
  color: #52c41a;
}

.feedback-msg.error {
  color: #cf1322;
}

@media (max-width: 768px) {
  .dialogue-box {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

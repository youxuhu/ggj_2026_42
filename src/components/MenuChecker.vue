<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { menuGroups, useGameStore } from "../stores/gameStore";

const store = useGameStore();
const { currentGroup, selectedItemIds, feedback, gameState, isOrderingPhase } =
  storeToRefs(store);

const orderLocked = computed(
  () => gameState.value !== "playing" || !isOrderingPhase.value,
);

const { toggleSelection, submitOrder, switchMenu } = store;

const handleToggle = (itemId: number) => {
  if (orderLocked.value) return;
  toggleSelection(itemId);
};
</script>

<template>
  <div class="menu-container" :class="{ over: orderLocked }">
    <div class="menu-content">
      <!-- 菜单模块 -->
      <div class="menu-module">
        <div class="menu-tabs">
          <px-button
            v-for="menu in menuGroups"
            :key="menu.id"
            :type="currentGroup.id === menu.id ? 'success' : 'base'"
            :use-throttle="false"
            @click="switchMenu(menu.id)"
          >
            {{ menu.title }}
          </px-button>
        </div>

        <h3 class="menu-title">{{ currentGroup.title }}</h3>
        <div class="menu-list">
          <div
            v-for="item in currentGroup.items"
            :key="item.id"
            class="menu-item"
            :class="{
              selected: selectedItemIds.includes(item.id),
              disabled: feedback.type === 'success' || orderLocked,
            }"
            @click="handleToggle(item.id)"
          >
            <div class="checkbox">
              <span v-if="selectedItemIds.includes(item.id)">✓</span>
            </div>
            <span class="item-name">{{ item.displayName ?? item.name }}</span>
          </div>
        </div>
      </div>

      <!-- 操作与反馈 -->
      <div class="actions">
        <!-- Feedback now in DialogueBox -->
        <px-button
          class="submit-btn"
          type="primary"
          :use-throttle="false"
          @click="submitOrder"
          :disabled="orderLocked"
        >
          提交订单
        </px-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-container {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: all 0.3s;
  background-image: url("/pic/menu.png");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

/* .menu-bg {
  display: block;
  width: 100%;
  height: auto;
} */

.menu-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 80px 35px 35px 35px;
  box-sizing: border-box;
}

.menu-container.over {
  opacity: 0.8;
}

.menu-container.over .menu-list,
.menu-container.over .actions {
  pointer-events: none;
}

/* 菜单模块 */
.menu-module {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  background: transparent;
  border-radius: 8px;
  padding: 15px;
  box-sizing: border-box;
  overflow: auto;
}

.menu-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
  overflow: hidden;
  padding-bottom: 5px;
}

/* .menu-tabs button {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 15px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.9em;
  transition: all 0.2s;
} */

.menu-tabs button.active {
  background: #1890ff;

  /* border: none; */
}

.menu-title {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  color: #333;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: transparent;
}

.menu-item.selected {
  background: transparent;
  border: none;
}

.menu-item.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1890ff;
  font-weight: bold;
  font-size: 14px;
}

.menu-item.selected .checkbox {
  border: none;
  background: transparent;
}

.item-name {
  font-size: 1em;
}

/* 操作区 */
.actions {
  /* margin-top: auto; No longer needed as menu-module takes flex */
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
  border-radius: 8px;
  padding: 0;
  padding-top: 10px;
  box-sizing: border-box;
  flex-shrink: 0;
  position: relative;
  /* min-height removed as feedback is gone */
  justify-content: flex-end;
}

.actions :deep(.px-button.submit-btn) {
  width: 100%;
  justify-content: center;
}

/* .feedback removed */

.feedback.success {
  background: transparent;
  color: #52c41a;
  border: none;
}

.feedback.error {
  background: transparent;
  color: #cf1322;
  border: none;
}
</style>

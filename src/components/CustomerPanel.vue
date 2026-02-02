<script setup lang="ts">
import { useGameStore, customerOrders } from '../stores/gameStore';
import { storeToRefs } from 'pinia';

const store = useGameStore();
const { currentOrder, feedback, completedCount, gameState, isDialoguePhase } = storeToRefs(store);
</script>

<template>
  <div class="customer-panel">
    <h3>顾客需求</h3>
    <div class="customer-info" :class="{ success: feedback.type === 'success' }">
      <div class="customer-header">
        <span class="customer-name">{{ currentOrder.name }}</span>
        <span class="phase-pill" :class="{ dialogue: isDialoguePhase, order: !isDialoguePhase }">
          {{ isDialoguePhase ? '对话阶段' : '点单阶段' }}
        </span>
      </div>
      <div class="customer-desc">{{ currentOrder.description }}</div>
    </div>
    
    <div class="status-meta">
      <span class="progress-meta">已完成 {{ completedCount }} / {{ customerOrders.length }}</span>
      <div v-if="gameState === 'failure'" class="state-tag fail">失败</div>
      <div v-else-if="gameState === 'success'" class="state-tag success">成功</div>
    </div>
  </div>
</template>

<style scoped>
.customer-panel {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-top: 20px;
}

.customer-info {
  margin-bottom: 15px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border-left: 4px solid #1890ff;
}

.customer-info.success {
  background: #f6ffed;
  border-left-color: #52c41a;
}

.customer-name {
  font-weight: bold;
  font-size: 1.1em;
  display: block;
  margin-bottom: 4px;
}

.customer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.phase-pill {
  font-size: 0.8em;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #d9d9d9;
}

.phase-pill.dialogue {
  color: #fa8c16;
  border-color: #ffd591;
  background: #fff7e6;
}

.phase-pill.order {
  color: #389e0d;
  border-color: #b7eb8f;
  background: #f6ffed;
}

.customer-desc {
  color: #666;
  line-height: 1.4;
}

.status-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  color: #888;
}

.state-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.8em;
}

.state-tag.fail {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffa39e;
}

.state-tag.success {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}
</style>

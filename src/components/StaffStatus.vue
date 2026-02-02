<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useGameStore, type EmployeeStatus } from "../stores/gameStore";

const store = useGameStore();
const { staffMood } = storeToRefs(store);

const statusList: { value: EmployeeStatus; img: string; label: string }[] = [
  { value: "smile", img: "/pic/emoji1.png", label: "标准笑容" },
  { value: "slacking", img: "/pic/emoji2.png", label: "摸鱼启动" },
  { value: "parenting", img: "/pic/emoji3.png", label: "育儿战备" },
  { value: "patient", img: "/pic/emoji4.png", label: "耐心慢放" },
  { value: "invisible", img: "/pic/emoji5.png", label: "柠檬隐身" },
];
</script>

<template>
  <div class="staff-module">
    <span class="module-title">员工状态</span>
    <div class="staff-toggle">
      <div
        v-for="item in statusList"
        :key="item.value"
        class="status-item"
        @click="store.staffMood = item.value"
        :title="item.label"
      >
        <img :src="item.img" :alt="item.label" class="status-img" />
        <div class="checkbox-container">
          <div class="checkbox" :class="{ checked: staffMood === item.value }">
            <span v-if="staffMood === item.value">✔</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.staff-module {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.module-title {
  font-weight: bold;
  font-size: 20px;
  margin-bottom: 20px;
  display: block;
  color: white;
}

.staff-toggle {
  display: flex;
  gap: 25px;
  justify-content: center;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  width: 40px;
}

.status-img {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: contain;
  margin-bottom: 10px;
}

.checkbox-container {
  padding: 2px;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  font-weight: bold;
  background: white;
  color: #333;
}
</style>

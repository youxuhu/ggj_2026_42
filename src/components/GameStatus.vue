<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../stores/gameStore";
import StaffStatus from "./StaffStatus.vue";

const store = useGameStore();
const { staffMood, pressurePercent } = storeToRefs(store);

const faceMap: Record<string, string> = {
  smile: "/pic/wanjiabiaoqing1.png",
  slacking: "/pic/wanjiabiaoqing2.png",
  parenting: "/pic/wanjiabiaoqing3.png",
  patient: "/pic/wanjiabiaoqing4.png",
  invisible: "/pic/wanjiabiaoqing5.png",
};

const faceImg = computed(() => {
  return faceMap[staffMood.value as string] ?? "/pic/wanjiabiaoqing6.png";
});
</script>

<template>
  <div class="game-status-module" style="background-color: #55051B;">
    <div class="staff-row">
      <StaffStatus />
    </div>

    <div class="bottom-row">
      <!-- 左侧：压力值 -->
      <div class="pressure-module">
        <div class="pressure-header">
          <div class="pressure-label" style="color: aliceblue;">压力值</div>
        </div>
        <div class="pressure-content">
          <PxProgress
            type="circle"
            :percentage="pressurePercent"
            :width="140"
            :stroke-width="24"
            :color="pressurePercent > 90 ? '#f5222d' : pressurePercent > 70 ? '#fa8c16' : pressurePercent > 40 ? '#faad14' : '#52c41a'"
            :showText="false"
            />
        </div>
      </div>

      <!-- 右侧：边框图片，边框内显示随状态切换的表情 -->
      <div class="face-frame">
        <img src="/pic/border2.png" alt="border" class="border-img"  />
        <img :src="faceImg" alt="face" class="face-img" style=""  />
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-status-module {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 30px;
  box-sizing: border-box;
  justify-content: space-evenly;
}


.staff-row {
  width: 100%;
  display: flex;
  justify-content: center;
}

.bottom-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.pressure-header {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.pressure-label {
  font-weight: bold;
}

.pressure-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.face-frame {
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.border-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.face-img {
  position: absolute;
  width: 85%;
  height: 77%;
  object-fit: contain;
  background-color: #FFBC0D;
}
</style>

<template>
  <div class="end-view" @click="goToHome">
    <div class="end-view__text">
      <p style="font-size: 48px">END</p>
      <br />
      <p style="color: #aca9a9">
        你开始渐渐熟悉了这份工作，身上的"新人味"淡了，取而代之的是淡淡的油烟味和一点人情味。
      </p>
    </div>
    <div class="end-view__tip">点击返回主菜单</div>
  </div>
</template>

<script setup lang="ts" name="End">
import { useRouter } from "vue-router";

const router = useRouter();

const goToHome = () => {
  router.push("/");
};
</script>

<style scoped>
.end-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #000;
  color: #ffffff;
  cursor: pointer;
  user-select: none;
}

.end-view__text {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
}

.end-view__tip {
  margin-top: 40px;
  font-size: 14px;
  opacity: 0.6;
}
</style>

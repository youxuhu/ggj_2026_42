<template>
  <div class="container" @click="goToHome">
    <div class="main">GameOver</div>
    <div><img src="../pic/gameoveremoji.png" alt="" /></div>
    <div class="tip">点击返回主菜单</div>
  </div>
</template>

<script lang="ts" setup name="GameOver">
import { useRouter } from "vue-router";

const router = useRouter();

const goToHome = () => {
  router.push("/");
};
</script>

<style scoped>
.container {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.main {
  /* height: 200px;
    width: 200px; */
  font-size: 48px;
}
.main:hover {
  color: rgb(85, 82, 82);
}

.tip {
  margin-top: 20px;
  font-size: 14px;
  opacity: 0.6;
}
</style>

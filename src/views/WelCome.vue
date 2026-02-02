<template>
  <div class="main">
    <!-- 使用v-show控制显示 -->
    <div class="container" v-show="showProgress">
      <px-progress
        class="mb-15"
        :percentage="cent"
        :stroke-width="24"
        striped
        striped-flow
        :duration="6"
        status="danger"
      />
      <br />
      loading。。。
    </div>

    <!-- 使用v-show控制显示，并添加动态类名 -->
    <div id="tmp2" v-show="showGameName" :class="{ show: showGameName }">
      <router-link :to="'/game'">何意味</router-link>
      <br /><br />
      <div style="font-size: 16px; text-align: center">点击标题开始游戏</div>
    </div>
  </div>
</template>

<script setup lang="ts" name="WelCome">
import { onMounted, ref } from "vue";
import fengmianImg from "../pic/fengmian.jpg";

let cent = ref(0);
let showProgress = ref(true);
let showGameName = ref(false);

onMounted(() => {
  const interval = setInterval(() => {
    if (cent.value < 100) {
      cent.value += 10;
    } else {
      // 通过改变响应式数据来控制显示
      showProgress.value = false;
      showGameName.value = true;
      const mains = document.getElementsByClassName("main");
      const main = mains[0] as HTMLDivElement;
      main.style.backgroundImage = `url('${fengmianImg}')`;
      main.style.backgroundSize = "100%";
      clearInterval(interval);
    }
  }, 200);
});
</script>

<style scoped>
.main {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  /* background-image: url("../pic/fengmian.jpg");
  background-size: 100%; */
}

.container {
  width: 30%;
  height: 30%;
}

#tmp2 {
  font-size: 48px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 3s ease;
}

#tmp2.show {
  opacity: 1;
  visibility: visible;
}
</style>

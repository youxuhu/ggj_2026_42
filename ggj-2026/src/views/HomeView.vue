<template>
  <div class="mainContainer">
    <div class="start">Start the game</div>
  </div>
</template>

<script setup lang="ts" name="HomeView">
import { useRouter } from 'vue-router';
import { onMounted, ref } from 'vue';

const router = useRouter();

onMounted(() => {
  // DOM 已经渲染完成，可以安全访问
  const divs = document.getElementsByClassName('start');
  const start = divs[0] as HTMLDivElement;

  if (start) {
    start.addEventListener('click', () => {
      router.push('/game');
    });
  }
});
</script>

<style scoped>
/* 样式保持不变 */
.mainContainer {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.start {
  font-size: 32px;
  text-shadow: 2px 2px 4px rgba(42, 41, 41, 0.5);
  cursor: pointer; /* 添加鼠标指针样式，表明可点击 */
  transition: color 0.3s ease; /* 添加过渡效果 */
}

.start:hover {
  color: rgb(73, 73, 75);
}
</style>

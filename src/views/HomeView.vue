<template>
  <div class="container">
    <div class="navi">
      <router-link to="/game/night/1">
        <button class="nav-btn">开始游戏</button>
      </router-link>
      <router-link to="/about">
        <button class="nav-btn">About</button>
      </router-link>
      <button class="nav-btn">Exit</button>
    </div>
  </div>
</template>

<script setup lang="ts" name="Home"></script>

<style scoped>
/* container css */
.container {
  height: 100%;
  width: 100%;
  background-color: orange;
  display: flex;
  justify-content: center;
  align-items: center;
}
/* 导航框css */
.navi {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* Safari 支持 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  width: 20%;
  height: 40%;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
/* 按钮css */
.nav-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  color: black;
  font-size: 32px;
  font-weight: 900;
}
</style>

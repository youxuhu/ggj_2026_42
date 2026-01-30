<template>
  <div class="common-layout">
    <el-container class="custom-container">
      <el-header class="custom-header">
        <Menu />
      </el-header>
      <el-main class="custom-main">
        <RouterView />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import Menu from "@/components/el-menu.vue";
import { RouterView } from "vue-router";
</script>
<style scoped>
* {
  padding: 0px;
  margin: 0px;
}

.common-layout {
  height: 100vh; /* 设置整个布局高度 */
}

.custom-container {
  height: 100%;
}

.custom-header {
  height: 80px; /* 设置 Header 高度 */
  line-height: 80px;
  /* background-color: skyblue; */
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
}

.custom-main {
  height: calc(100vh - 80px); /* 计算剩余高度 */
  background-color: #f0f2f5;
  padding: 0;
  overflow: auto;
}
</style>

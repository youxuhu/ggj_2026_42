<template>
  <el-menu
    :default-active="activeIndex"
    class="el-menu-demo"
    mode="horizontal"
    :ellipsis="false"
    router
    @select="handleSelect"
  >
    <el-menu-item index="/about" class="item"> 🎮 logo </el-menu-item>

    <el-menu-item index="/" class="item">🏠 Home</el-menu-item>
    <el-menu-item index="/game" class="item">🎤 游戏</el-menu-item>
    <el-menu-item index="/score" class="item">🏆 排分榜</el-menu-item>
  </el-menu>
</template>

<script lang="ts" setup name="Menu">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const activeIndex = ref(route.path);

// 监听路由变化，更新激活状态
watch(
  () => route.path,
  (newPath) => {
    activeIndex.value = newPath;
  },
);

const handleSelect = (key: string, keyPath: string[]) => {
  console.log("导航到:", key, keyPath);
};
</script>

<style scoped>
* {
  padding: 0px;
  margin: 0px;
}

.el-menu--horizontal > .el-menu-item:nth-child(1) {
  margin-right: auto;
}

.el-menu-demo {
  width: 100%;
}

.item {
  font-size: 20px;
}
</style>

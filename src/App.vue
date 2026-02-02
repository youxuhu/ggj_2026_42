<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
* {
  padding: 0px;
  margin: 0px;
  user-select: none;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* allow text selection where users need to type */
input,
textarea {
  user-select: text;
}

/* 页面切换过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style scoped></style>

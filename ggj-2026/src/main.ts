

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import App from './App.vue';
import router from './router';
import 'element-plus/dist/index.css';
import zhCn from "element-plus/es/locale/lang/zh-cn";


//创建app
const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

//安装pinia
app.use(createPinia());

//安装router
app.use(router);

//安装ElementPlus
app.use(ElementPlus, {
  locale: zhCn,
});

//挂载app
app.mount('#app');

import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import router from "./router";
// ElementPlus 配置
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import zhCn from "element-plus/es/locale/lang/zh-cn";


import PixelUI from '@mmt817/pixel-ui'
import '@mmt817/pixel-ui/dist/index.css'

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PixelUI);
app.use(ElementPlus, {
  locale: zhCn,
});

app.mount("#app");

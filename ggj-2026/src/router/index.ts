import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import MaxScore from "../views/MaxScore.vue"
import Game from "../views/Game.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
      {
          path: '/score',
          name: "score",
          component:MaxScore
      }, {
          path: '/game',
          name: 'game',
          component:Game,
    }
  ],
});

export default router;

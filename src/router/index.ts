import EndView from "@/views/End.vue";
import Game from "@/views/Game.vue";
import GameOver from "@/views/GameOver.vue";
import WelCome from "@/views/WelCome.vue";
import { createRouter, createWebHistory } from "vue-router";
// import GameDay from "@/views/GameDay.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "welcome",
      component: WelCome,
    },
    {
      path: "/gameover",
      name: "gameover",
      component: GameOver,
    },
    {
      path: "/end",
      name: "end",
      component: EndView,
    },
    // {
    //   path: "/about",
    //   name: "about",
    //   component: () => import("../views/AboutView.vue"),
    // },
    {
      path: "/game",
      name: "game",
      component: Game,
    },
    {
      path: "/game/day/:dayIndex",
      name: "gameday",
      component: Game,
    },
    {
      path: "/game/night/:nightIndex",
      name: "gamenight",
      component: Game,
    },
    {
      path: "/game/transition/:transitionIndex",
      name: "gametransition",
      component: Game,
    },
  ],
});

export default router;

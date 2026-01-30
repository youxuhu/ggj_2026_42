// stores/score.ts
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface GameScore {
  date: string;
  name: string;
  score: number;
  level?: number;
  time?: number;
}

export const useScoreStore = defineStore("score", () => {
  // State - 初始化一些示例数据
  const score = ref<GameScore[]>([
    {
      date: "2026-01-28",
      name: "玩家_测试1",
      score: 150,
      level: 3,
    },
  ]);

  // Getters (Computed)
  const averageScore = computed(() => {
    if (score.value.length === 0) return 0;
    const total = score.value.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / score.value.length);
  });

  const maxScore = computed(() => {
    if (score.value.length === 0) return 0;
    return Math.max(...score.value.map((item) => item.score));
  });

  // 按分数排序的榜单
  const sortedScores = computed(() => {
    return [...score.value].sort((a, b) => b.score - a.score);
  });

  // 获取前N名
  const getTopScores = (n: number = 10) => {
    return sortedScores.value.slice(0, n);
  };

  // Actions
  const addScore = (
    name: string,
    scoreValue: number,
    level: number = 0,
    time: number = 0,
  ) => {
    const newScore: GameScore = {
      date: new Date().toISOString().split("T")[0] ?? "1970-01-01",
      name,
      score: scoreValue,
      level: level > 0 ? level : undefined,
      time: time > 0 ? time : undefined,
    };
    score.value.push(newScore);

    // 持久化到本地存储
    localStorage.setItem("gameScores", JSON.stringify(score.value));
  };

  const deleteScore = (index: number) => {
    score.value.splice(index, 1);
    localStorage.setItem("gameScores", JSON.stringify(score.value));
  };

  // 清空所有分数
  const clearScores = () => {
    score.value = [];
    localStorage.removeItem("gameScores");
  };

  // 从本地存储加载分数
  const loadScores = () => {
    try {
      const saved = localStorage.getItem("gameScores");
      if (saved) {
        score.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error("加载分数失败:", error);
    }
  };

  return {
    // State
    score,
    // Getters
    averageScore,
    maxScore,
    sortedScores,
    // Actions
    addScore,
    deleteScore,
    clearScores,
    loadScores,
    getTopScores,
  };
});

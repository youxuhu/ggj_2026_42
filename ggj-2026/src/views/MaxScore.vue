<template>
  <div class="scoreboard">
    <!-- 标题 -->
    <div class="header">
      <h1>排分榜</h1>
      <p class="subtitle">玩家排名</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon"></div>
        <div class="stat-info">
          <div class="stat-label">总游戏数</div>
          <div class="stat-value">{{ scoreStore.score.length }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"></div>
        <div class="stat-info">
          <div class="stat-label">最高分</div>
          <div class="stat-value">{{ scoreStore.maxScore }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"></div>
        <div class="stat-info">
          <div class="stat-label">平均分</div>
          <div class="stat-value">{{ scoreStore.averageScore }}</div>
        </div>
      </div>
    </div>

    <!-- 排分表 -->
    <div class="table-container">
      <el-table
        :data="scoreStore.sortedScores"
        style="width: 100%"
        :default-sort="{ prop: 'score', order: 'descending' }"
        stripe
      >
        <!-- 排名 -->
        <el-table-column label="排名" width="80" align="center">
          <template #default="{ $index }">
            <div class="rank" :class="{ 'top-three': $index < 3 }">
              {{ getMedalIcon($index) }} #{{ $index + 1 }}
            </div>
          </template>
        </el-table-column>

        <!-- 玩家名称 -->
        <el-table-column prop="name" label="玩家" width="200" align="center">
          <template #default="{ row }">
            <div class="player-name">{{ row.name }}</div>
          </template>
        </el-table-column>

        <!-- 分数 -->
        <el-table-column
          prop="score"
          label="分数"
          width="150"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <div
              class="score"
              :class="{ 'high-score': row.score >= scoreStore.maxScore }"
            >
              {{ row.score }}
            </div>
          </template>
        </el-table-column>

        <!-- 关卡 -->
        <el-table-column
          prop="level"
          label="完成关卡"
          width="150"
          align="center"
        >
          <template #default="{ row }">
            <div v-if="row.level" class="level">
              <span class="level-badge">第 {{ row.level }} 关</span>
            </div>
            <div v-else class="level">-</div>
          </template>
        </el-table-column>

        <!-- 日期 -->
        <el-table-column prop="date" label="日期" width="180" align="center">
          <template #default="{ row }">
            <div class="date">{{ formatDate(row.date) }}</div>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ $index }">
            <el-button
              type="danger"
              size="small"
              @click="deleteScore($index)"
              link
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 空状态 -->
    <div v-if="scoreStore.score.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">暂无分数记录</p>
      <el-button type="primary" @click="goToGame">开始游戏</el-button>
    </div>

    <!-- 操作按钮 -->
    <div v-else class="action-buttons">
      <el-button type="primary" @click="goToGame">🎮 返回游戏</el-button>
      <el-button type="danger" @click="showClearConfirm">🗑️ 清空所有</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useScoreStore } from "@/stores/score";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";

const scoreStore = useScoreStore();
const router = useRouter();

// 加载分数
scoreStore.loadScores();

// 获取奖牌图标
const getMedalIcon = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "";
};

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// 删除分数
const deleteScore = (index: number) => {
  scoreStore.deleteScore(index);
  ElMessage.success("分数已删除");
};

// 显示清空确认
const showClearConfirm = () => {
  ElMessageBox.confirm("此操作将永久删除所有分数，是否继续?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      scoreStore.clearScores();
      ElMessage.success("所有分数已清空");
    })
    .catch(() => {
      ElMessage.info("已取消清空操作");
    });
};

// 返回游戏
const goToGame = () => {
  router.push("/game");
};
</script>

<style scoped>
.scoreboard {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

/* 标题 */
.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 32px;
  color: #333;
  margin-bottom: 8px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 16px;
  color: #666;
}

/* 统计卡片 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 32px;
  min-width: 50px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

/* 表格容器 */
.table-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

/* 排名 */
.rank {
  font-size: 14px;
  font-weight: bold;
  color: #666;
}

.rank.top-three {
  color: #ffb81c;
  font-size: 16px;
}

/* 玩家名称 */
.player-name {
  font-weight: 500;
  color: #333;
}

/* 分数 */
.score {
  font-size: 16px;
  font-weight: bold;
  color: #4caf50;
}

.score.high-score {
  color: #ff6b6b;
  font-size: 18px;
}

/* 关卡 */
.level {
  font-size: 14px;
  color: #666;
}

.level-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

/* 日期 */
.date {
  font-size: 13px;
  color: #999;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  color: #999;
  margin-bottom: 20px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-buttons :deep(.el-button) {
  min-width: 120px;
}

/* 响应式 */
@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: 1fr;
  }

  .table-container :deep(.el-table) {
    font-size: 12px;
  }

  .table-container :deep(.el-table__header th) {
    padding: 8px 0;
  }

  .table-container :deep(.el-table__body td) {
    padding: 8px 0;
  }
}
</style>

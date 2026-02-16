<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const betaFeatures = [
  {
    id: 'pathfinding',
    name: '路径查找测试',
    description: 'A* 算法实现，点击两个地块显示最短路径',
    route: '/beta/pathfinding',
    status: 'completed'
  },
  {
    id: 'movement-range',
    name: '移动力范围测试',
    description: 'Dijkstra 算法实现，显示指定移动力内可到达的所有地块',
    route: '/beta/movement-range',
    status: 'new'
  }
];

const goBack = () => {
  router.push('/');
};

const goToFeature = (route: string) => {
  router.push(route);
};
</script>

<template>
  <div class="beta-entry">
    <div class="beta-header">
      <button class="back-btn" @click="goBack">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        返回主页
      </button>
      <div class="beta-title">
        <span class="beta-badge">BETA</span>
        <h1>功能测试</h1>
      </div>
    </div>

    <div class="beta-content">
      <div class="features-grid">
        <div 
          v-for="feature in betaFeatures" 
          :key="feature.id"
          class="feature-card"
          @click="goToFeature(feature.route)"
        >
          <div class="feature-header">
            <h3>{{ feature.name }}</h3>
            <span :class="['status-badge', feature.status]">
              {{ feature.status === 'completed' ? '已完成' : '新功能' }}
            </span>
          </div>
          <p class="feature-description">{{ feature.description }}</p>
          <div class="feature-arrow">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.beta-entry {
  width: 100%;
  min-height: 100vh;
  background: #0a0a0f;
  position: relative;
}

.beta-entry::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at top, rgba(245, 158, 11, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at bottom, rgba(59, 130, 246, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.beta-header {
  position: sticky;
  top: 0;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(10, 10, 15, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  backdrop-filter: blur(8px);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #a0a0a0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.beta-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.beta-badge {
  padding: 4px 8px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #fff;
}

.beta-title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #e0e0e0;
  letter-spacing: 0.5px;
}

.beta-content {
  position: relative;
  z-index: 1;
  padding: 40px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.features-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-card {
  position: relative;
  padding: 24px;
  background: rgba(15, 15, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.feature-card:hover {
  background: rgba(20, 20, 25, 0.9);
  border-color: rgba(245, 158, 11, 0.3);
  transform: translateX(4px);
}

.feature-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.feature-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #e0e0e0;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.status-badge.completed {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.status-badge.new {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.feature-description {
  margin: 0;
  font-size: 13px;
  color: #808080;
  line-height: 1.6;
}

.feature-arrow {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: #404040;
  transition: all 0.3s;
}

.feature-card:hover .feature-arrow {
  color: #f59e0b;
  transform: translateY(-50%) translateX(4px);
}
</style>

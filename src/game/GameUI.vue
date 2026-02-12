<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/game';

const router = useRouter();
const gameStore = useGameStore();

const showMenu = ref(false);

const turn = computed(() => gameStore.turn);

const ducat = computed(() => gameStore.getResource('ducat'));

const currentCountry = computed(() => gameStore.currentCountry);

const currentStability = computed(() => gameStore.currentStability);

const selectedTile = ref<{ q: number; r: number; terrainId: string; ownerId: string } | null>(null);

const ownerName = computed(() => {
  if (!selectedTile.value) return '';
  const country = gameStore.getCountry(selectedTile.value.ownerId);
  return country?.shortName || country?.name || selectedTile.value.ownerId;
});

const terrainName = computed(() => {
  if (!selectedTile.value) return '';
  const terrains: Record<string, string> = {
    'plains': '平原',
    'forest': '森林',
    'mountain': '山地',
    'mountains': '山脉',
    'desert': '沙漠',
    'shallow_sea': '浅海',
    'deep_sea': '深海',
    'barrier_mountain': '屏障山',
    'swamp': '沼泽',
    'tundra': '冻原',
    'volcano': '火山',
    'hills': '丘陵'
  };
  return terrains[selectedTile.value.terrainId] || selectedTile.value.terrainId;
});

const handleEndTurn = () => {
  gameStore.nextTurn();
};

const handleBackToMenu = () => {
  showMenu.value = false;
  gameStore.resetGame();
  router.push('/');
};

const handleCanvasClick = (event: MouseEvent) => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  console.log('Canvas clicked at:', x, y);
};

onMounted(() => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.addEventListener('click', handleCanvasClick);
  }
});

onUnmounted(() => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.removeEventListener('click', handleCanvasClick);
  }
});
</script>

<template>
  <div class="fixed inset-0 pointer-events-none">
    <div class="pointer-events-auto">
      <div class="absolute top-0 left-0 right-0 h-12 bg-stone-950/80 border-b border-stone-800/50 flex items-center justify-between px-4">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center">
              <svg class="w-4 h-4 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
            </div>
            <span class="text-stone-400 font-light tracking-widest text-xs uppercase">Conquistador</span>
          </div>
          
          <div class="flex items-center gap-4 text-stone-400 text-sm">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span>回合 {{ turn }}</span>
            </div>
            
            <div class="h-4 w-px bg-stone-700"></div>
            
            <div class="flex items-center gap-2">
              <span class="text-amber-400">💰</span>
              <span class="text-amber-300 font-mono">{{ ducat }}</span>
              <span class="text-stone-500 text-xs">ducat</span>
            </div>
            
            <div class="h-4 w-px bg-stone-700"></div>
            
            <div class="flex items-center gap-2">
              <span class="text-green-400">⚖️</span>
              <span class="text-green-300 font-mono">{{ (currentStability * 100).toFixed(0) }}%</span>
              <span class="text-stone-500 text-xs">稳定</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <div v-if="currentCountry" class="flex items-center gap-2 px-3 py-1 rounded bg-stone-800/50">
            <div 
              class="w-3 h-3 rounded-full" 
              :style="{ backgroundColor: currentCountry.color }"
            ></div>
            <span class="text-stone-300 text-sm">{{ currentCountry.shortName || currentCountry.name }}</span>
          </div>
          
          <button 
            @click="showMenu = !showMenu"
            class="p-2 rounded hover:bg-stone-800/50 transition-colors"
          >
            <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="showMenu" class="pointer-events-auto fixed inset-0 bg-stone-950/90 flex items-center justify-center z-50">
      <div class="bg-stone-900 border border-stone-800 rounded-lg p-6 min-w-[300px]">
        <h2 class="text-stone-200 font-light tracking-wider text-lg mb-6 text-center">游戏菜单</h2>
        <div class="flex flex-col gap-3">
          <button 
            @click="showMenu = false"
            class="px-4 py-3 bg-stone-800/50 border border-stone-700/50 hover:border-amber-800/50 text-stone-300 text-sm tracking-wider transition-colors rounded"
          >
            继续游戏
          </button>
          <button 
            @click="handleBackToMenu"
            class="px-4 py-3 bg-stone-800/50 border border-stone-700/50 hover:border-red-800/50 text-stone-300 text-sm tracking-wider transition-colors rounded"
          >
            返回主菜单
          </button>
        </div>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute left-4 top-20 w-64 bg-stone-950/80 border border-stone-800/50 rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-stone-800/50">
          <h3 class="text-stone-300 font-light tracking-wider text-sm">地块信息</h3>
        </div>
        <div class="p-4">
          <div v-if="selectedTile" class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-stone-500">坐标</span>
              <span class="text-stone-300">{{ selectedTile.q }}, {{ selectedTile.r }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-500">地形</span>
              <span class="text-stone-300">{{ terrainName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-500">所有者</span>
              <span class="text-stone-300">{{ ownerName }}</span>
            </div>
          </div>
          <div v-else class="text-stone-500 text-sm">
            点击地块查看详情
          </div>
        </div>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
        <button 
          @click="handleEndTurn"
          class="px-6 py-3 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 border border-amber-700/50 text-amber-100 text-sm tracking-wider transition-all rounded shadow-lg shadow-amber-900/30"
        >
          结束回合
        </button>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute right-4 top-20 flex flex-col gap-2">
        <button 
          class="w-10 h-10 bg-stone-950/80 border border-stone-800/50 rounded flex items-center justify-center hover:border-amber-800/50 transition-colors"
          title="放大"
        >
          <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
          </svg>
        </button>
        <button 
          class="w-10 h-10 bg-stone-950/80 border border-stone-800/50 rounded flex items-center justify-center hover:border-amber-800/50 transition-colors"
          title="缩小"
        >
          <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute bottom-4 right-4 text-stone-600 text-xs tracking-wider">
        <span class="text-stone-500">ESC</span> 菜单
        <span class="mx-2 text-stone-700">|</span>
        <span class="text-stone-500">滚轮</span> 缩放
        <span class="mx-2 text-stone-700">|</span>
        <span class="text-stone-500">拖拽</span> 移动
      </div>
    </div>
  </div>
</template>

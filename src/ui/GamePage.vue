<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/game';
import { startGame } from '../main';
import GameUI from '../game/GameUI.vue';

const router = useRouter();
const gameStore = useGameStore();
const isInitialized = ref(false);

onMounted(() => {
  if (!gameStore.gameMode) {
    router.push('/');
    return;
  }

  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (canvas && !isInitialized.value) {
    startGame(gameStore.gameMode);
    isInitialized.value = true;
  }
});

onUnmounted(() => {
  gameStore.resetGame();
});
</script>

<template>
  <div class="w-full h-screen relative">
    <canvas id="gameCanvas" class="absolute inset-0 z-10"></canvas>
    <div id="ui"></div>
    <GameUI v-if="gameStore.gameMode === 'GAME'" />
    <div v-else-if="gameStore.gameMode === 'CUSTOM'" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-stone-500 text-sm">编辑器加载中...</div>
    </div>
  </div>
</template>

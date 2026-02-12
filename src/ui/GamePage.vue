<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/game';
import { startGame } from '../main';

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
    <canvas id="gameCanvas"></canvas>
    <div id="ui"></div>
  </div>
</template>

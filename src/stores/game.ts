import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useGameStore = defineStore('game', () => {
  const gameMode = ref<'RANDOM' | 'CUSTOM' | null>(null);
  const isGameStarted = ref(false);
  const isPaused = ref(false);

  const isPlaying = computed(() => isGameStarted.value && !isPaused.value);

  function setGameMode(mode: 'RANDOM' | 'CUSTOM') {
    gameMode.value = mode;
    isGameStarted.value = true;
  }

  function pauseGame() {
    isPaused.value = true;
  }

  function resumeGame() {
    isPaused.value = false;
  }

  function resetGame() {
    gameMode.value = null;
    isGameStarted.value = false;
    isPaused.value = false;
  }

  return {
    gameMode,
    isGameStarted,
    isPaused,
    isPlaying,
    setGameMode,
    pauseGame,
    resumeGame,
    resetGame
  };
});

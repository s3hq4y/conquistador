import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type GameMode = 'GAME' | 'RANDOM' | 'CUSTOM';

export interface OwnerState {
  resources: Record<string, number>;
}

export interface OwnerStates {
  [ownerId: string]: OwnerState;
}

export const useGameStore = defineStore('game', () => {
  const gameMode = ref<GameMode | null>(null);
  const isGameStarted = ref(false);
  const isPaused = ref(false);
  const currentOwner = ref<string>('player');
  const ownerStates = ref<OwnerStates>({});

  const isPlaying = computed(() => isGameStarted.value && !isPaused.value);

  const currentOwnerState = computed(() => ownerStates.value[currentOwner.value] || { resources: {} });

  function setGameMode(mode: GameMode) {
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
    currentOwner.value = 'player';
    ownerStates.value = {};
  }

  function setOwnerStates(states: OwnerStates) {
    ownerStates.value = states;
  }

  function setCurrentOwner(ownerId: string) {
    currentOwner.value = ownerId;
  }

  function getResource(resourceId: string, ownerId?: string): number {
    const owner = ownerId || currentOwner.value;
    return ownerStates.value[owner]?.resources?.[resourceId] || 0;
  }

  function setResource(resourceId: string, value: number, ownerId?: string) {
    const owner = ownerId || currentOwner.value;
    if (!ownerStates.value[owner]) {
      ownerStates.value[owner] = { resources: {} };
    }
    ownerStates.value[owner].resources[resourceId] = value;
  }

  function modifyResource(resourceId: string, delta: number, ownerId?: string): number {
    const owner = ownerId || currentOwner.value;
    const current = getResource(resourceId, owner);
    const newValue = Math.max(0, current + delta);
    setResource(resourceId, newValue, owner);
    return newValue;
  }

  return {
    gameMode,
    isGameStarted,
    isPaused,
    isPlaying,
    currentOwner,
    ownerStates,
    currentOwnerState,
    setGameMode,
    pauseGame,
    resumeGame,
    resetGame,
    setOwnerStates,
    setCurrentOwner,
    getResource,
    setResource,
    modifyResource
  };
});

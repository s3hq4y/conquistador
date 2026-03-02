import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type GameType = 'single' | 'hotseat';
export type GameMode = 'GAME' | 'RANDOM' | 'CUSTOM';

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  isLocal: boolean;
  isAI: boolean;
}

export interface OwnerState {
  resources: Record<string, number>;
}

export interface OwnerStates {
  [ownerId: string]: OwnerState;
}

export const useGameStore = defineStore('game', () => {
  const gameMode = ref<GameMode | null>(null);
  const gameType = ref<GameType | null>(null);
  const isGameStarted = ref(false);
  const isPaused = ref(false);
  const players = ref<PlayerInfo[]>([]);
  const currentPlayerIndex = ref(0);
  const currentOwner = ref<string>('player');
  const ownerStates = ref<OwnerStates>({});

  const currentPlayer = computed(() => players.value[currentPlayerIndex.value] || null);
  const isHotseat = computed(() => gameType.value === 'hotseat');
  const isSingle = computed(() => gameType.value === 'single');

  const isPlaying = computed(() => isGameStarted.value && !isPaused.value);

  const currentOwnerState = computed(() => ownerStates.value[currentOwner.value] || { resources: {} });

  function setGameMode(mode: GameMode) {
    gameMode.value = mode;
    isGameStarted.value = true;
  }

  function setGameType(type: GameType) {
    gameType.value = type;
  }

  function setPlayers(newPlayers: PlayerInfo[]) {
    players.value = newPlayers;
    if (newPlayers.length > 0) {
      currentPlayerIndex.value = 0;
      currentOwner.value = newPlayers[0].id;
    }
  }

  function nextPlayer() {
    if (players.value.length === 0) return;
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length;
    currentOwner.value = players.value[currentPlayerIndex.value].id;
  }

  function getCurrentPlayerId(): string {
    return players.value[currentPlayerIndex.value]?.id || '';
  }

  function pauseGame() {
    isPaused.value = true;
  }

  function resumeGame() {
    isPaused.value = false;
  }

  function resetGame() {
    gameMode.value = null;
    gameType.value = null;
    isGameStarted.value = false;
    isPaused.value = false;
    players.value = [];
    currentPlayerIndex.value = 0;
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

  function canAfford(cost: Record<string, number>, ownerId?: string): boolean {
    const owner = ownerId || currentOwner.value;
    for (const [resourceId, amount] of Object.entries(cost)) {
      if (getResource(resourceId, owner) < amount) {
        return false;
      }
    }
    return true;
  }

  function deductResources(cost: Record<string, number>, ownerId?: string): boolean {
    if (!canAfford(cost, ownerId)) {
      return false;
    }
    const owner = ownerId || currentOwner.value;
    for (const [resourceId, amount] of Object.entries(cost)) {
      modifyResource(resourceId, -amount, owner);
    }
    return true;
  }

  function addResources(cost: Record<string, number>, ownerId?: string): void {
    const owner = ownerId || currentOwner.value;
    for (const [resourceId, amount] of Object.entries(cost)) {
      modifyResource(resourceId, amount, owner);
    }
  }

  return {
    gameMode,
    gameType,
    isGameStarted,
    isPaused,
    isPlaying,
    players,
    currentPlayerIndex,
    currentPlayer,
    currentOwner,
    ownerStates,
    currentOwnerState,
    isHotseat,
    isSingle,
    setGameMode,
    setGameType,
    setPlayers,
    nextPlayer,
    getCurrentPlayerId,
    pauseGame,
    resumeGame,
    resetGame,
    setOwnerStates,
    setCurrentOwner,
    getResource,
    setResource,
    modifyResource,
    canAfford,
    deductResources,
    addResources
  };
});

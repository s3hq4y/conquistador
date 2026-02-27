<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore, type OwnerStates } from '../stores/game';
import { useGameEventStore } from '../stores/gameEvent';
import { debugConfig } from '../core/config';
import {
  GameTopBar,
  GameMenu,
  PlayerSwitchOverlay,
  AITurnOverlay,
  Compass,
  DirectionIndicator,
  TileInfoPanel,
  CombatLog,
  CombatResultModal,
  UnitInfoPanel,
  EndTurnButton,
  ZoomControls,
  KeyboardHints,
  TileUnitsPanel
} from './components/overlay';

interface UnitStats {
  hp?: number;
  attack?: number;
  defense?: number;
  movement?: number;
  range?: number;
}

interface UnitInfo {
  id: string;
  q: number;
  r: number;
  owner: string;
  traits: string[];
  hp: number;
}

const router = useRouter();
const { t, locale } = useI18n();
const gameStore = useGameStore();
const gameEventStore = useGameEventStore();

const switchLocale = (newLocale: string) => {
  locale.value = newLocale;
};

const showMenu = ref(false);
const turn = ref(1);
const combatLog = ref<{ message: string; type: string }[]>([]);
const showPlayerSwitch = ref(false);
const selectedUnit = ref<{ unit: UnitInfo; stats: UnitStats } | null>(null);
const showUnitInfo = ref(false);
const combatResult = ref<{ show: boolean; attackerDamage: number; defenderDamage: number; attackerDied: boolean; defenderDied: boolean; attackerId: string; defenderId: string } | null>(null);

const ducat = computed(() => gameStore.getResource('ducat'));

const currentPlayer = computed(() => gameStore.currentPlayer);
const isHotseat = computed(() => gameStore.isHotseat);
const isAITurn = computed(() => gameEventStore.isAITurn);

const selectedTile = computed(() => gameEventStore.selectedTile);

const tileUnits = computed(() => gameEventStore.tileUnits);
const showTileUnits = computed(() => gameEventStore.showTileUnits);
const tileUnitsPosition = computed(() => gameEventStore.tileUnitsPosition);

const tileCapacity = computed(() => {
  if (!selectedTile.value?.capacity) return null;
  return selectedTile.value.capacity;
});

const ownerName = computed(() => {
  if (!selectedTile.value) return '';
  return t(`game.${selectedTile.value.owner}`) || selectedTile.value.owner;
});

const terrainName = computed(() => {
  if (!selectedTile.value) return '';
  const camelCaseTerrain = selectedTile.value.terrain.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  return t(`game.${camelCaseTerrain}`) || selectedTile.value.terrain;
});

const handleEndTurn = () => {
  if (window.__endTurn) {
    window.__endTurn();
    if (!gameStore.isHotseat) {
      turn.value++;
    }
  }
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

const handleTurnEnded = () => {
  turn.value = gameEventStore.currentTurn;
};

const handlePlayerChanged = () => {
  if (!shouldShowPlayerSwitch()) return;
  showPlayerSwitch.value = true;
  setTimeout(() => {
    showPlayerSwitch.value = false;
  }, 2000);
};

const shouldShowPlayerSwitch = (): boolean => {
  const player = currentPlayer.value;
  if (!player) return false;
  return isHotseat.value && player.isLocal && !player.isAI;
};

const handleCombatExecuted = (event: CustomEvent) => {
  const result = event.detail;
  if (!result) return;
  
  combatLog.value.push({
    message: `战斗: 攻击方造成 ${result.damage} 伤害, 防守方造成 ${result.defenderDamage} 伤害`,
    type: 'combat'
  });
  if (combatLog.value.length > 5) {
    combatLog.value.shift();
  }

  combatResult.value = {
    show: true,
    attackerDamage: result.damage,
    defenderDamage: result.defenderDamage,
    attackerDied: result.attackerDied,
    defenderDied: result.defenderDied,
    attackerId: result.attackerId,
    defenderId: result.defenderId
  };

  setTimeout(() => {
    if (combatResult.value) {
      combatResult.value.show = false;
    }
  }, 3000);
};

watch(() => gameEventStore.currentTurn, (newTurn) => {
  turn.value = newTurn;
});

watch(() => gameEventStore.currentPlayerId, () => {
  if (!shouldShowPlayerSwitch()) {
    showPlayerSwitch.value = false;
    return;
  }
  showPlayerSwitch.value = true;
  setTimeout(() => {
    showPlayerSwitch.value = false;
  }, 2000);
});

watch(() => gameEventStore.combatResult, (result) => {
  if (!result) return;
  
  combatLog.value.push({
    message: `战斗: 攻击方造成 ${result.damage} 伤害, 防守方造成 ${result.defenderDamage} 伤害`,
    type: 'combat'
  });
  if (combatLog.value.length > 5) {
    combatLog.value.shift();
  }

  combatResult.value = {
    show: true,
    attackerDamage: result.damage,
    defenderDamage: result.defenderDamage,
    attackerDied: !result.attackerSurvived,
    defenderDied: !result.defenderSurvived,
    attackerId: result.attackerId,
    defenderId: result.defenderId
  };

  setTimeout(() => {
    if (combatResult.value) {
      combatResult.value.show = false;
    }
    gameEventStore.clearCombatResult();
  }, 2000);
});

watch(() => gameEventStore.selectedUnit, (unit) => {
  if (!unit) {
    selectedUnit.value = null;
    showUnitInfo.value = false;
    return;
  }
  
  selectedUnit.value = {
    unit: {
      id: unit.id,
      q: 0,
      r: 0,
      owner: unit.owner,
      traits: unit.traits || [],
      hp: unit.hp
    },
    stats: gameEventStore.unitStats || {
      hp: unit.hp,
      attack: 0,
      defense: 0,
      movement: 0,
      range: 1
    }
  };
  showUnitInfo.value = true;
});

const closeCombatResult = () => {
  if (combatResult.value) {
    combatResult.value.show = false;
  }
  gameEventStore.clearCombatResult();
};

const closeUnitInfo = () => {
  showUnitInfo.value = false;
  selectedUnit.value = null;
  gameEventStore.clearSelection();
};

const handleTileUnitSelect = (unitId: string) => {
  gameEventStore.triggerTileUnitSelect(unitId);
};

const handleTileUnitReorder = (newOrder: string[]) => {
  gameEventStore.reorderTileUnits(newOrder);
};

const handleTileUnitsClose = () => {
  gameEventStore.clearTileUnits();
};

onMounted(() => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.addEventListener('click', handleCanvasClick);
  }
  
  window.__setOwnerStates = (states: OwnerStates) => {
    gameStore.setOwnerStates(states);
  };

  window.addEventListener('turn:ended', handleTurnEnded as any);
  window.addEventListener('player:changed', handlePlayerChanged as any);
  window.addEventListener('combat:executed', handleCombatExecuted as any);
});

onUnmounted(() => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.removeEventListener('click', handleCanvasClick);
  }
  
  window.__setOwnerStates = undefined;
  window.removeEventListener('turn:ended', handleTurnEnded as any);
  window.removeEventListener('player:changed', handlePlayerChanged as any);
  window.removeEventListener('combat:executed', handleCombatExecuted as any);
});
</script>

<template>
  <div class="fixed inset-0 pointer-events-none">
    <Compass :show="debugConfig.game.compass" />

    <GameTopBar 
      :turn="turn"
      :current-player="currentPlayer"
      :is-hotseat="isHotseat"
      :locale="locale"
      :ducat="ducat"
      @update:locale="switchLocale"
      @toggle-menu="showMenu = !showMenu"
    />

    <GameMenu 
      v-if="showMenu"
      @close="showMenu = false"
      @back-to-menu="handleBackToMenu"
    />

    <PlayerSwitchOverlay 
      :show="showPlayerSwitch"
      :current-player="currentPlayer"
    />

    <AITurnOverlay :show="isAITurn" />

    <DirectionIndicator :show="debugConfig.game.directionArrows" />

    <TileInfoPanel 
      :selected-tile="selectedTile"
      :terrain-name="terrainName"
      :owner-name="ownerName"
    />

    <CombatLog :logs="combatLog" />

    <CombatResultModal 
      :result="combatResult"
      @close="closeCombatResult"
    />

    <UnitInfoPanel 
      v-if="showUnitInfo"
      :unit="selectedUnit?.unit || null"
      :stats="selectedUnit?.stats || null"
      @close="closeUnitInfo"
    />

    <TileUnitsPanel
      v-if="showTileUnits"
      :units="tileUnits"
      :capacity="tileCapacity"
      :position="tileUnitsPosition"
      @select="handleTileUnitSelect"
      @reorder="handleTileUnitReorder"
      @close="handleTileUnitsClose"
    />

    <EndTurnButton @click="handleEndTurn" />

    <ZoomControls />

    <KeyboardHints />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore, type OwnerStates, type PlayerInfo } from '../stores/game';
import { useGameEventStore } from '../stores/gameEvent';

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

const availableLocales = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en-US', label: 'English' }
];

const switchLocale = (newLocale: string) => {
  locale.value = newLocale;
};

const showMenu = ref(false);
const turn = ref(1);
const selectedTile = ref<{ q: number; r: number; terrain: string; owner: string } | null>(null);
const combatLog = ref<{ message: string; type: string }[]>([]);
const showPlayerSwitch = ref(false);
const selectedUnit = ref<{ unit: UnitInfo; stats: UnitStats } | null>(null);
const showUnitInfo = ref(false);
const combatResult = ref<{ show: boolean; attackerDamage: number; defenderDamage: number; attackerDied: boolean; defenderDied: boolean; attackerId: string; defenderId: string } | null>(null);

const ducat = computed(() => gameStore.getResource('ducat'));

const currentPlayer = computed(() => gameStore.currentPlayer);
const isHotseat = computed(() => gameStore.isHotseat);

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

watch(() => gameEventStore.currentTurn, (newTurn) => {
  turn.value = newTurn;
});

watch(() => gameEventStore.currentPlayerId, () => {
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

const ownerColors: Record<string, string> = {
  neutral: '#808080',
  player: '#268ceb',
  enemy: '#eb3838'
};

const ownerNames: Record<string, string> = {
  neutral: '中立',
  player: '玩家',
  enemy: '敌人'
};

const unitOwnerColor = computed(() => {
  if (!selectedUnit.value) return '#808080';
  return ownerColors[selectedUnit.value.unit.owner] || '#808080';
});

const unitOwnerName = computed(() => {
  if (!selectedUnit.value) return '';
  return ownerNames[selectedUnit.value.unit.owner] || selectedUnit.value.unit.owner;
});

const hpPercent = computed(() => {
  if (!selectedUnit.value) return 0;
  const maxHp = selectedUnit.value.stats.hp || 100;
  return Math.round((selectedUnit.value.unit.hp / maxHp) * 100);
});

onMounted(() => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.addEventListener('click', handleCanvasClick);
  }
  
  window.__setOwnerStates = (states: OwnerStates) => {
    gameStore.setOwnerStates(states);
  };
});

onUnmounted(() => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    canvas.removeEventListener('click', handleCanvasClick);
  }
  
  window.__setOwnerStates = undefined;
});
</script>

<template>
  <div class="fixed inset-0 pointer-events-none">
    <div class="pointer-events-auto">
      <div class="absolute top-0 left-0 right-0 h-12 bg-stone-950/80 border-b border-stone-800/50 flex items-center justify-between px-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-amber-400">🪙</span>
            <span class="text-amber-300 font-mono">{{ ducat }}</span>
            <span class="text-stone-500 text-xs">ducat</span>
          </div>
          
          <div v-if="currentPlayer" class="flex items-center gap-2">
            <div 
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: currentPlayer.color }"
            ></div>
            <span class="text-stone-300 text-sm">{{ currentPlayer.name }}</span>
            <span v-if="isHotseat" class="text-stone-500 text-xs">({{ t('game.hotseat') }})</span>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-4 text-stone-400 text-sm">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span>{{ t('game.turn') }} {{ turn }}</span>
            </div>
          </div>
          
          <div class="h-4 w-px bg-stone-700"></div>
          
          <div class="flex items-center gap-2">
            <button 
              v-for="loc in availableLocales"
              :key="loc.code"
              @click="switchLocale(loc.code)"
              :class="[
                'px-2 py-1 text-xs font-medium rounded transition-colors',
                locale === loc.code 
                  ? 'bg-amber-700 text-amber-100' 
                  : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'
              ]"
            >
              {{ loc.label }}
            </button>
          </div>
          
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center">
              <svg class="w-4 h-4 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
            </div>
            <span class="text-stone-400 font-light tracking-widest text-xs uppercase">Conquistador</span>
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
        <h2 class="text-stone-200 font-light tracking-wider text-lg mb-6 text-center">{{ t('game.gameMenu') }}</h2>
        <div class="flex flex-col gap-3">
          <button 
            @click="showMenu = false"
            class="px-4 py-3 bg-stone-800/50 border border-stone-700/50 hover:border-amber-800/50 text-stone-300 text-sm tracking-wider transition-colors rounded"
          >
            {{ t('game.continueGame') }}
          </button>
          <button 
            @click="handleBackToMenu"
            class="px-4 py-3 bg-stone-800/50 border border-stone-700/50 hover:border-red-800/50 text-stone-300 text-sm tracking-wider transition-colors rounded"
          >
            {{ t('game.backToMenu') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showPlayerSwitch" class="pointer-events-auto fixed inset-0 bg-stone-950/80 flex items-center justify-center z-40">
      <div class="bg-stone-900 border border-amber-800/50 rounded-lg p-8 text-center">
        <div class="text-stone-400 text-sm mb-4">{{ t('game.playerSwitch') }}</div>
        <div v-if="currentPlayer" class="flex items-center justify-center gap-3">
          <div 
            class="w-8 h-8 rounded-full"
            :style="{ backgroundColor: currentPlayer.color }"
          ></div>
          <span class="text-xl text-stone-200">{{ currentPlayer.name }}</span>
        </div>
        <div class="text-stone-500 text-xs mt-4">{{ t('game.playerSwitchHint') }}</div>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute left-4 top-20 w-64 bg-stone-950/80 border border-stone-800/50 rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-stone-800/50">
          <h3 class="text-stone-300 font-light tracking-wider text-sm">{{ t('game.tileInfo') }}</h3>
        </div>
        <div class="p-4">
          <div v-if="selectedTile" class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-stone-500">{{ t('game.coordinates') }}</span>
              <span class="text-stone-300">{{ selectedTile.q }}, {{ selectedTile.r }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-500">{{ t('game.terrain') }}</span>
              <span class="text-stone-300">{{ terrainName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-500">{{ t('game.owner') }}</span>
              <span class="text-stone-300">{{ ownerName }}</span>
            </div>
          </div>
          <div v-else class="text-stone-500 text-sm">
            {{ t('game.tileInfoPlaceholder') }}
          </div>
        </div>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute left-4 top-80 w-64 bg-stone-950/80 border border-stone-800/50 rounded-lg overflow-hidden" v-if="combatLog.length > 0">
        <div class="px-4 py-3 border-b border-stone-800/50">
          <h3 class="text-stone-300 font-light tracking-wider text-sm">{{ t('game.combatLog') }}</h3>
        </div>
        <div class="p-2 max-h-32 overflow-y-auto">
          <div v-for="(log, index) in combatLog" :key="index" class="text-xs text-stone-400 py-1">
            {{ log.message }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="combatResult && combatResult.show" class="pointer-events-auto fixed inset-0 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black/50" @click="closeCombatResult"></div>
      <div class="relative bg-stone-900 border border-amber-700/50 rounded-xl p-6 min-w-[320px] shadow-2xl shadow-amber-900/30 animate-pulse-once">
        <div class="text-center">
          <div class="text-amber-500 text-lg font-medium mb-4">⚔️ 战斗结果 ⚔️</div>
          
          <div class="flex items-center justify-center gap-4 mb-4">
            <div class="text-center">
              <div class="text-red-400 text-2xl font-bold">-{{ combatResult.attackerDamage }}</div>
              <div class="text-stone-500 text-xs mt-1">攻击方受伤</div>
            </div>
            <div class="text-stone-600 text-xl">VS</div>
            <div class="text-center">
              <div class="text-red-400 text-2xl font-bold">-{{ combatResult.defenderDamage }}</div>
              <div class="text-stone-500 text-xs mt-1">防守方受伤</div>
            </div>
          </div>

          <div v-if="combatResult.defenderDied" class="mb-4">
            <div class="text-green-400 text-lg font-medium animate-bounce">🏆 防守方被击败!</div>
          </div>
          <div v-if="combatResult.attackerDied" class="mb-4">
            <div class="text-red-400 text-lg font-medium animate-bounce">💀 攻击方被击败!</div>
          </div>

          <div class="text-stone-500 text-xs mt-4">
            正在继续...
          </div>
        </div>
      </div>
    </div>

    <div v-if="showUnitInfo && selectedUnit" class="pointer-events-auto">
      <div class="absolute right-4 top-20 w-72 bg-stone-950/90 border border-stone-800/50 rounded-lg overflow-hidden z-30">
        <div class="px-4 py-3 border-b border-stone-800/50 flex items-center justify-between">
          <h3 class="text-stone-300 font-light tracking-wider text-sm">{{ t('game.unitInfo') || '单位信息' }}</h3>
          <button @click="closeUnitInfo" class="text-stone-500 hover:text-stone-300 text-lg">×</button>
        </div>
        <div class="p-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" :style="{ backgroundColor: unitOwnerColor }">
              ⚔️
            </div>
            <div>
              <div class="text-stone-200 font-medium text-sm">{{ selectedUnit.unit.id.slice(0, 16) }}...</div>
              <div class="flex items-center gap-2 mt-1">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: unitOwnerColor }"></span>
                <span class="text-stone-400 text-xs">{{ unitOwnerName }}</span>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <div class="flex justify-between text-xs text-stone-500 mb-1">
              <span>生命值</span>
              <span class="text-stone-300">{{ selectedUnit.unit.hp }} / {{ selectedUnit.stats.hp || 100 }}</span>
            </div>
            <div class="h-2 bg-stone-800 rounded-full overflow-hidden">
              <div 
                class="h-full transition-all duration-300"
                :class="{
                  'bg-green-500': hpPercent > 60,
                  'bg-yellow-500': hpPercent > 30 && hpPercent <= 60,
                  'bg-red-500': hpPercent <= 30
                }"
                :style="{ width: `${hpPercent}%` }"
              ></div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="bg-stone-800/50 rounded p-2 text-center">
              <div class="text-amber-400 text-lg">⚔️</div>
              <div class="text-stone-200 font-medium">{{ selectedUnit.stats.attack || 0 }}</div>
              <div class="text-stone-500 text-xs">攻击</div>
            </div>
            <div class="bg-stone-800/50 rounded p-2 text-center">
              <div class="text-blue-400 text-lg">🛡️</div>
              <div class="text-stone-200 font-medium">{{ selectedUnit.stats.defense || 0 }}</div>
              <div class="text-stone-500 text-xs">防御</div>
            </div>
            <div class="bg-stone-800/50 rounded p-2 text-center">
              <div class="text-green-400 text-lg">🎯</div>
              <div class="text-stone-200 font-medium">{{ selectedUnit.stats.range || 1 }}</div>
              <div class="text-stone-500 text-xs">射程</div>
            </div>
          </div>

          <div>
            <div class="text-xs text-stone-500 mb-2">特性</div>
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="trait in selectedUnit.unit.traits" 
                :key="trait"
                class="px-2 py-1 bg-stone-800/50 rounded text-xs text-stone-400"
              >
                {{ trait }}
              </span>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-stone-800/50">
            <div class="text-xs text-stone-500">
              位置: Q:{{ selectedUnit.unit.q }}, R:{{ selectedUnit.unit.r }}
            </div>
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
          {{ t('game.endTurn') }}
        </button>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute right-4 top-20 flex flex-col gap-2">
        <button 
          class="w-10 h-10 bg-stone-950/80 border border-stone-800/50 rounded flex items-center justify-center hover:border-amber-800/50 transition-colors"
          :title="t('game.zoomIn')"
        >
          <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
          </svg>
        </button>
        <button 
          class="w-10 h-10 bg-stone-950/80 border border-stone-800/50 rounded flex items-center justify-center hover:border-amber-800/50 transition-colors"
          :title="t('game.zoomOut')"
        >
          <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="pointer-events-auto">
      <div class="absolute bottom-4 right-4 text-stone-600 text-xs tracking-wider">
        <span class="text-stone-500">{{ t('common.esc') }}</span> {{ t('common.menu') }}
        <span class="mx-2 text-stone-700">|</span>
        <span class="text-stone-500">{{ t('common.scroll') }}</span> {{ t('common.zoom') }}
        <span class="mx-2 text-stone-700">|</span>
        <span class="text-stone-500">{{ t('game.drag') }}</span> {{ t('game.move') }}
      </div>
    </div>
  </div>
</template>

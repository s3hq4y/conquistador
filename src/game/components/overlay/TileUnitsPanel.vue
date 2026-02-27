<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '@/stores/game';
import { useGameEventStore, type TileUnitInfo } from '@/stores/gameEvent';

interface TileCapacity {
  army: number;
  building: number;
  armyCount: number;
  buildingCount: number;
}

const { t } = useI18n();
const gameStore = useGameStore();
const gameEventStore = useGameEventStore();

const props = defineProps<{
  units: TileUnitInfo[];
  capacity: TileCapacity | null;
  position: { q: number; r: number } | null;
}>();

const emit = defineEmits<{
  (e: 'select', unitId: string): void;
  (e: 'reorder', newOrder: string[]): void;
  (e: 'close'): void;
}>();

const playerColors = computed(() => {
  const colors: Record<string, string> = {};
  for (const player of gameStore.players) {
    colors[player.id] = player.color;
  }
  colors['neutral'] = '#808080';
  return colors;
});

const playerNames = computed(() => {
  const names: Record<string, string> = {};
  for (const player of gameStore.players) {
    names[player.id] = player.name;
  }
  names['neutral'] = t('game.neutral');
  return names;
});

const armyCapacityDisplay = computed(() => {
  if (!props.capacity) return '';
  return `${props.capacity.armyCount}/${props.capacity.army}`;
});

const buildingCapacityDisplay = computed(() => {
  if (!props.capacity) return '';
  return `${props.capacity.buildingCount}/${props.capacity.building}`;
});

const isFullArmy = computed(() => {
  if (!props.capacity) return false;
  return props.capacity.armyCount >= props.capacity.army;
});

const isFullBuilding = computed(() => {
  if (!props.capacity) return false;
  return props.capacity.buildingCount >= props.capacity.building;
});

const getOwnerColor = (owner: string) => {
  return playerColors.value[owner] || '#808080';
};

const getOwnerName = (owner: string) => {
  return playerNames.value[owner] || owner;
};

const getHpPercent = (unit: TileUnitInfo) => {
  if (!unit.maxHp) return 0;
  return Math.round((unit.hp / unit.maxHp) * 100);
};

const getTraitIcon = (traits: string[]) => {
  if (!traits || traits.length === 0) return '⚔️';
  return '⚔️';
};

const draggedIndex = ref<number | null>(null);

const handleDragStart = (index: number) => {
  draggedIndex.value = index;
};

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === index) return;
};

const handleDrop = (targetIndex: number) => {
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    draggedIndex.value = null;
    return;
  }
  
  const newOrder = [...props.units.map(u => u.id)];
  const draggedId = newOrder[draggedIndex.value];
  newOrder.splice(draggedIndex.value, 1);
  newOrder.splice(targetIndex, 0, draggedId);
  
  emit('reorder', newOrder);
  draggedIndex.value = null;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
};
</script>

<template>
  <div 
    v-if="units.length > 0 && position"
    class="absolute left-4 top-72 w-80 bg-stone-950/95 border border-stone-700/50 rounded-lg overflow-hidden z-40"
  >
    <div class="px-4 py-3 border-b border-stone-800/50 flex items-center justify-between bg-stone-900/50">
      <div class="flex items-center gap-2">
        <span class="text-stone-300 font-light tracking-wider text-sm">
          {{ t('game.tileUnits') || '地块单位' }}
        </span>
        <span class="text-stone-500 text-xs">
          Q:{{ position.q }}, R:{{ position.r }}
        </span>
      </div>
      <button 
        @click="emit('close')" 
        class="text-stone-500 hover:text-stone-300 text-lg leading-none"
      >
        ×
      </button>
    </div>

    <div class="px-4 py-2 border-b border-stone-800/30 bg-stone-900/30">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1">
            <span class="text-stone-400">{{ t('game.army') || '军队' }}:</span>
            <span 
              class="font-medium"
              :class="isFullArmy ? 'text-red-400' : 'text-green-400'"
            >
              {{ armyCapacityDisplay }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-stone-400">{{ t('game.building') || '建筑' }}:</span>
            <span 
              class="font-medium"
              :class="isFullBuilding ? 'text-red-400' : 'text-green-400'"
            >
              {{ buildingCapacityDisplay }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="max-h-64 overflow-y-auto">
      <div
        v-for="(unit, index) in units"
        :key="unit.id"
        class="px-4 py-3 border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors cursor-pointer select-none"
        :class="{ 
          'bg-stone-800/40': unit.isTop,
          'opacity-50': draggedIndex === index
        }"
        draggable="true"
        @click="emit('select', unit.id)"
        @dragstart="handleDragStart(index)"
        @dragover="handleDragOver($event, index)"
        @drop="handleDrop(index)"
        @dragend="handleDragEnd"
      >
        <div class="flex items-center gap-3">
          <div class="flex flex-col gap-1 text-stone-600">
            <button 
              class="hover:text-stone-300 cursor-move text-xs px-1"
              title="拖拽排序"
            >
              ⋮⋮
            </button>
          </div>
          
          <div 
            v-if="unit.isTop"
            class="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r"
          ></div>
          
          <div 
            class="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
            :style="{ backgroundColor: getOwnerColor(unit.owner) }"
          >
            {{ getTraitIcon(unit.traits) }}
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-stone-200 text-sm font-medium truncate">
                {{ unit.id.slice(0, 12) }}...
              </span>
              <span 
                v-if="unit.isTop"
                class="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded"
              >
                {{ t('game.top') || '优先' }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span 
                class="w-2 h-2 rounded-full"
                :style="{ backgroundColor: getOwnerColor(unit.owner) }"
              ></span>
              <span class="text-stone-500 text-xs">
                {{ getOwnerName(unit.owner) }}
              </span>
            </div>
          </div>
          
          <div class="shrink-0">
            <div class="flex items-center gap-1">
              <div class="w-12 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                <div 
                  class="h-full transition-all duration-300"
                  :class="{
                    'bg-green-500': getHpPercent(unit) > 60,
                    'bg-yellow-500': getHpPercent(unit) > 30 && getHpPercent(unit) <= 60,
                    'bg-red-500': getHpPercent(unit) <= 30
                  }"
                  :style="{ width: `${getHpPercent(unit)}%` }"
                ></div>
              </div>
              <span class="text-stone-500 text-xs w-8 text-right">
                {{ unit.hp }}/{{ unit.maxHp }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="unit.traits && unit.traits.length > 0" class="mt-2 ml-13 flex flex-wrap gap-1">
          <span 
            v-for="trait in unit.traits.slice(0, 3)" 
            :key="trait"
            class="px-1.5 py-0.5 bg-stone-800/50 rounded text-xs text-stone-500"
          >
            {{ trait }}
          </span>
          <span 
            v-if="unit.traits.length > 3"
            class="px-1.5 py-0.5 text-xs text-stone-600"
          >
            +{{ unit.traits.length - 3 }}
          </span>
        </div>
      </div>
    </div>

    <div class="px-4 py-2 bg-stone-900/30 border-t border-stone-800/30">
      <div class="text-xs text-stone-600 text-center">
        {{ t('game.tileUnitsHint') || '拖拽调整顺序，点击选择单位' }}
      </div>
    </div>
  </div>
</template>

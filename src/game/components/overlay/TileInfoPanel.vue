<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface SelectedTile {
  q: number;
  r: number;
  terrain: string;
  owner: string;
  capacity?: {
    army: number;
    building: number;
    armyCount: number;
    buildingCount: number;
  };
}

const props = defineProps<{
  selectedTile: SelectedTile | null;
  terrainName: string;
  ownerName: string;
}>();

const { t } = useI18n();

const hasCapacity = computed(() => {
  return props.selectedTile?.capacity !== undefined;
});

const armyDisplay = computed(() => {
  if (!props.selectedTile?.capacity) return '';
  return `${props.selectedTile.capacity.armyCount}/${props.selectedTile.capacity.army}`;
});

const buildingDisplay = computed(() => {
  if (!props.selectedTile?.capacity) return '';
  return `${props.selectedTile.capacity.buildingCount}/${props.selectedTile.capacity.building}`;
});

const isArmyFull = computed(() => {
  if (!props.selectedTile?.capacity) return false;
  return props.selectedTile.capacity.armyCount >= props.selectedTile.capacity.army;
});

const isBuildingFull = computed(() => {
  if (!props.selectedTile?.capacity) return false;
  return props.selectedTile.capacity.buildingCount >= props.selectedTile.capacity.building;
});

const hasMultipleUnits = computed(() => {
  if (!props.selectedTile?.capacity) return false;
  return props.selectedTile.capacity.armyCount > 1;
});
</script>

<template>
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
        
        <template v-if="hasCapacity">
          <div class="pt-2 border-t border-stone-800/50 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-stone-500">{{ t('game.army') || '军队' }}</span>
              <div class="flex items-center gap-2">
                <span 
                  class="font-medium"
                  :class="isArmyFull ? 'text-red-400' : 'text-green-400'"
                >
                  {{ armyDisplay }}
                </span>
                <span 
                  v-if="hasMultipleUnits"
                  class="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded"
                >
                  {{ t('game.multi') || '多单位' }}
                </span>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-stone-500">{{ t('game.building') || '建筑' }}</span>
              <span 
                class="font-medium"
                :class="isBuildingFull ? 'text-red-400' : 'text-green-400'"
              >
                {{ buildingDisplay }}
              </span>
            </div>
          </div>
        </template>
      </div>
      <div v-else class="text-stone-500 text-sm">
        {{ t('game.tileInfoPlaceholder') }}
      </div>
    </div>
  </div>
</template>

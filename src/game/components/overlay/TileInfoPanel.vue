<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface SelectedTile {
  q: number;
  r: number;
  terrain: string;
  owner: string;
}

const props = defineProps<{
  selectedTile: SelectedTile | null;
  terrainName: string;
  ownerName: string;
}>();

const { t } = useI18n();
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
      </div>
      <div v-else class="text-stone-500 text-sm">
        {{ t('game.tileInfoPlaceholder') }}
      </div>
    </div>
  </div>
</template>

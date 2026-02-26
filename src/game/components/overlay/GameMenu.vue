<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { debugConfig } from '../../../core/config';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'backToMenu'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="fixed inset-0 bg-stone-950/90 flex items-center justify-center z-50">
    <div class="bg-stone-900 border border-stone-800 rounded-lg p-6 min-w-[300px]">
      <h2 class="text-stone-200 font-light tracking-wider text-lg mb-6 text-center">{{ t('game.gameMenu') }}</h2>
      <div class="flex flex-col gap-3">
        <button 
          @click="emit('close')"
          class="px-4 py-3 bg-stone-800/50 border border-stone-700/50 hover:border-amber-800/50 text-stone-300 text-sm tracking-wider transition-colors rounded"
        >
          {{ t('game.continueGame') }}
        </button>
        <button 
          @click="emit('backToMenu')"
          class="px-4 py-3 bg-stone-800/50 border border-stone-700/50 hover:border-red-800/50 text-stone-300 text-sm tracking-wider transition-colors rounded"
        >
          {{ t('game.backToMenu') }}
        </button>
      </div>
      
      <div class="mt-6 pt-4 border-t border-stone-700/50">
        <h3 class="text-stone-400 text-xs font-medium mb-3">调试功能</h3>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="debugConfig.game.compass"
              class="w-4 h-4 rounded bg-stone-800 border-stone-600 text-amber-500 focus:ring-amber-500"
            />
            <span class="text-stone-400 text-sm">指南针</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="debugConfig.game.directionArrows"
              class="w-4 h-4 rounded bg-stone-800 border-stone-600 text-amber-500 focus:ring-amber-500"
            />
            <span class="text-stone-400 text-sm">方向箭头</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="debugConfig.game.coloredBorder"
              class="w-4 h-4 rounded bg-stone-800 border-stone-600 text-amber-500 focus:ring-amber-500"
            />
            <span class="text-stone-400 text-sm">彩色边框</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

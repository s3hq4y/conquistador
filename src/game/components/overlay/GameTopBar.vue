<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PlayerInfo } from '../../stores/game';

const props = defineProps<{
  turn: number;
  currentPlayer: PlayerInfo | null;
  isHotseat: boolean;
  locale: string;
  ducat: number;
}>();

const emit = defineEmits<{
  (e: 'update:locale', value: string): void;
  (e: 'toggleMenu'): void;
}>();

const { t } = useI18n();

const availableLocales = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en-US', label: 'English' }
];

const switchLocale = (newLocale: string) => {
  emit('update:locale', newLocale);
};
</script>

<template>
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
        @click="emit('toggleMenu')"
        class="p-2 rounded hover:bg-stone-800/50 transition-colors"
      >
        <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="absolute right-4 top-20 flex flex-col gap-2 pointer-events-auto">
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
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
    <button 
      @click="emit('click')"
      class="px-6 py-3 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 border border-amber-700/50 text-amber-100 text-sm tracking-wider transition-all rounded shadow-lg shadow-amber-900/30"
    >
      {{ t('game.endTurn') }}
    </button>
  </div>
</template>

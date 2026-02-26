<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  show: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-stone-950/80 flex items-center justify-center z-[45]">
    <div class="bg-stone-900 border border-amber-800/50 rounded-lg p-8 text-center min-w-[320px]">
      <div class="text-amber-400 text-lg mb-3">🤖 {{ t('game.aiTurnTitle') }}</div>
      <div class="text-stone-400 text-sm">{{ t('game.aiTurnHint') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface CombatLogItem {
  message: string;
  type: string;
}

defineProps<{
  logs: CombatLogItem[];
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="logs.length > 0" class="absolute left-4 top-80 w-64 bg-stone-950/80 border border-stone-800/50 rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-stone-800/50">
      <h3 class="text-stone-300 font-light tracking-wider text-sm">{{ t('game.combatLog') }}</h3>
    </div>
    <div class="p-2 max-h-32 overflow-y-auto">
      <div v-for="(log, index) in logs" :key="index" class="text-xs text-stone-400 py-1">
        {{ log.message }}
      </div>
    </div>
  </div>
</template>

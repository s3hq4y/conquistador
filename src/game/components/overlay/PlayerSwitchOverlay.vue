<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { PlayerInfo } from '../../../stores/game';

defineProps<{
  show: boolean;
  currentPlayer: PlayerInfo | null;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-stone-950/80 flex items-center justify-center z-40">
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
</template>

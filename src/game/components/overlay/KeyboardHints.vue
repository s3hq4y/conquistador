<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="absolute bottom-4 right-4 text-stone-600 text-xs tracking-wider pointer-events-none">
    <span class="text-stone-500">{{ t('common.esc') }}</span> {{ t('common.menu') }}
    <span class="mx-2 text-stone-700">|</span>
    <span class="text-stone-500">{{ t('common.scroll') }}</span> {{ t('common.zoom') }}
    <span class="mx-2 text-stone-700">|</span>
    <span class="text-stone-500">{{ t('game.drag') }}</span> {{ t('game.move') }}
  </div>
</template>

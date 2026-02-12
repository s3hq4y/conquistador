<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '../stores/game';

const router = useRouter();
const { t } = useI18n();
const gameStore = useGameStore();

const handleStart = (mode: 'RANDOM' | 'CUSTOM') => {
  gameStore.setGameMode(mode);
  router.push('/game');
};
</script>

<template>
  <div class="min-h-screen relative overflow-hidden flex items-center justify-center">
    <div class="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
    <div class="absolute inset-0 opacity-30">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl"></div>
    </div>
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50"></div>

    <div class="relative z-10 max-w-2xl w-full mx-4">
      <div class="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-10 backdrop-blur-xl shadow-2xl shadow-black/50">
        <div class="flex flex-col items-center text-center">
          <div class="relative mb-8">
            <div class="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-cyan-400 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
            <div class="relative w-20 h-20 bg-gradient-to-tr from-emerald-400 via-cyan-400 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <svg class="w-10 h-10 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
            </div>
          </div>
          <h1 class="text-4xl font-bold text-white mb-3 tracking-tight">
            {{ t('entry.title') }}
          </h1>
          <p class="text-lg text-slate-400 mb-2">{{ t('entry.subtitle') }}</p>
          <div class="flex items-center gap-2 mb-8">
            <span class="px-3 py-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 rounded-full border border-emerald-400/20">{{ t('entry.tags.mapBuilder') }}</span>
            <span class="px-3 py-1 text-xs font-medium text-cyan-400 bg-cyan-400/10 rounded-full border border-cyan-400/20">{{ t('entry.tags.engine') }}</span>
          </div>
          <p class="text-slate-300 mb-10 max-w-md leading-relaxed">
            {{ t('entry.description') }}
          </p>
          <div class="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              @click="handleStart('RANDOM')"
              class="group relative py-4 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200 overflow-hidden"
            >
              <span class="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span class="relative flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                {{ t('entry.buttons.randomMap') }}
              </span>
            </button>
            <button 
              @click="handleStart('CUSTOM')"
              class="group relative py-4 px-6 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200 overflow-hidden"
            >
              <span class="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span class="relative flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                {{ t('entry.buttons.customMap') }}
              </span>
            </button>
          </div>
          <div class="mt-8 pt-6 border-t border-slate-700/50 w-full">
            <div class="flex items-start gap-3 text-left">
              <div class="flex-shrink-0 w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p class="text-sm text-slate-300 font-medium">{{ t('entry.tips.title') }}</p>
                <p class="text-xs text-slate-500 mt-1">{{ t('entry.tips.content') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-6 text-center">
        <p class="text-xs text-slate-600" v-html="t('entry.keyboard', { key: '<kbd class=\'px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 border border-slate-700\'>ESC</kbd>' })"></p>
      </div>
    </div>
  </div>
</template>

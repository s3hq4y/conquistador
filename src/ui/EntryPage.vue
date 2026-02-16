<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore, type GameMode } from '../stores/game';

const router = useRouter();
const { t } = useI18n();
const gameStore = useGameStore();

const handleStart = (mode: GameMode) => {
  gameStore.setGameMode(mode);
  router.push('/game');
};

const goToBeta = () => {
  router.push('/beta');
};
</script>

<template>
  <div class="min-h-screen bg-stone-950 relative overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-stone-950"></div>
    
    <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMSIvPjwvc3ZnPg==');"></div>

    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/30 to-transparent"></div>
    <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent"></div>

    <div class="relative z-10 min-h-screen flex flex-col">
      <header class="p-8 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-900/30">
            <svg class="w-5 h-5 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
          </div>
          <span class="text-stone-400 font-light tracking-widest text-sm uppercase">Conquistador</span>
        </div>
        <div class="flex items-center gap-4">
          <button 
            @click="goToBeta"
            class="group flex items-center gap-2 px-4 py-2 bg-amber-900/20 border border-amber-800/30 hover:border-amber-700/50 rounded-lg transition-all duration-300"
          >
            <span class="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded">BETA</span>
            <span class="text-amber-400 text-sm group-hover:text-amber-300 transition-colors">功能测试</span>
          </button>
          <div class="text-stone-600 text-xs tracking-wider">v1.0.0</div>
        </div>
      </header>

      <main class="flex-1 flex items-center justify-center px-8">
        <div class="max-w-4xl w-full">
          <div class="text-center mb-16">
            <div class="inline-block mb-6">
              <div class="relative">
                <div class="absolute inset-0 bg-amber-800/20 blur-3xl rounded-full"></div>
                <h1 class="relative text-7xl font-extralight text-stone-200 tracking-[0.2em] uppercase">
                  Conquistador
                </h1>
              </div>
            </div>
            <p class="text-stone-500 font-light tracking-[0.3em] text-sm uppercase mb-4">
              {{ t('entry.subtitle') }}
            </p>
            <div class="flex items-center justify-center gap-4 text-stone-600">
              <span class="text-xs tracking-wider">Hexagonal Strategy</span>
              <span class="w-1 h-1 rounded-full bg-stone-700"></span>
              <span class="text-xs tracking-wider">Turn-based</span>
              <span class="w-1 h-1 rounded-full bg-stone-700"></span>
              <span class="text-xs tracking-wider">Map Editor</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <button 
              @click="handleStart('GAME')"
              class="group relative p-6 bg-stone-900/50 border border-stone-800/50 hover:border-amber-800/50 transition-all duration-300"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-amber-900/0 to-amber-900/0 group-hover:from-amber-900/5 group-hover:to-amber-900/10 transition-all duration-300"></div>
              <div class="relative flex items-start gap-4">
                <div class="w-12 h-12 rounded bg-stone-800/50 group-hover:bg-amber-900/30 flex items-center justify-center transition-colors duration-300">
                  <svg class="w-6 h-6 text-stone-500 group-hover:text-amber-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="text-left flex-1">
                  <h3 class="text-stone-200 font-light tracking-wider text-lg mb-1">
                    游戏模式
                  </h3>
                  <p class="text-stone-600 text-sm font-light">
                    加载示例场景开始游戏
                  </p>
                </div>
                <svg class="w-5 h-5 text-stone-700 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            <button 
              @click="handleStart('RANDOM')"
              class="group relative p-6 bg-stone-900/50 border border-stone-800/50 hover:border-amber-800/50 transition-all duration-300"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-amber-900/0 to-amber-900/0 group-hover:from-amber-900/5 group-hover:to-amber-900/10 transition-all duration-300"></div>
              <div class="relative flex items-start gap-4">
                <div class="w-12 h-12 rounded bg-stone-800/50 group-hover:bg-amber-900/30 flex items-center justify-center transition-colors duration-300">
                  <svg class="w-6 h-6 text-stone-500 group-hover:text-amber-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </div>
                <div class="text-left flex-1">
                  <h3 class="text-stone-200 font-light tracking-wider text-lg mb-1">
                    {{ t('entry.buttons.randomMap') }}
                  </h3>
                  <p class="text-stone-600 text-sm font-light">
                    程序化生成独特地形
                  </p>
                </div>
                <svg class="w-5 h-5 text-stone-700 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            <button 
              @click="handleStart('CUSTOM')"
              class="group relative p-6 bg-stone-900/50 border border-stone-800/50 hover:border-amber-800/50 transition-all duration-300"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-amber-900/0 to-amber-900/0 group-hover:from-amber-900/5 group-hover:to-amber-900/10 transition-all duration-300"></div>
              <div class="relative flex items-start gap-4">
                <div class="w-12 h-12 rounded bg-stone-800/50 group-hover:bg-amber-900/30 flex items-center justify-center transition-colors duration-300">
                  <svg class="w-6 h-6 text-stone-500 group-hover:text-amber-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </div>
                <div class="text-left flex-1">
                  <h3 class="text-stone-200 font-light tracking-wider text-lg mb-1">
                    {{ t('entry.buttons.customMap') }}
                  </h3>
                  <p class="text-stone-600 text-sm font-light">
                    从零开始构建你的世界
                  </p>
                </div>
                <svg class="w-5 h-5 text-stone-700 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </main>

      <footer class="p-8 flex justify-between items-center text-stone-600">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
            <span class="text-xs tracking-wider">Ready</span>
          </div>
        </div>
        <div class="text-xs tracking-wider text-stone-700">
          <span class="text-stone-600">ESC</span> Menu
          <span class="mx-2 text-stone-800">|</span>
          <span class="text-stone-600">Scroll</span> Zoom
        </div>
      </footer>
    </div>
  </div>
</template>

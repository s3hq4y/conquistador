<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore, type GameType, type GameMode, type PlayerInfo } from '../stores/game';

const router = useRouter();
const { t, locale } = useI18n();
const gameStore = useGameStore();

const availableLocales = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en-US', label: 'English' }
];

const availableColors = [
  { id: 'blue', color: '#3b82f6', name: '蓝色' },
  { id: 'red', color: '#ef4444', name: '红色' },
  { id: 'green', color: '#22c55e', name: '绿色' },
  { id: 'yellow', color: '#eab308', name: '黄色' },
  { id: 'purple', color: '#a855f7', name: '紫色' },
  { id: 'orange', color: '#f97316', name: '橙色' }
];

const step = ref<'mode' | 'players' | 'game'>('mode');
const selectedGameType = ref<GameType | null>(null);
const selectedMode = ref<GameMode>('GAME');
const players = ref<PlayerInfo[]>([]);

const switchLocale = (newLocale: string) => {
  locale.value = newLocale;
};

const selectGameType = (type: GameType) => {
  selectedGameType.value = type;
  if (type === 'single') {
    players.value = [
      { id: 'player', name: '玩家', color: '#3b82f6', isLocal: true, isAI: false },
      { id: 'enemy', name: '敌方', color: '#ef4444', isLocal: false, isAI: true }
    ];
    step.value = 'game';
    startGame();
  } else {
    players.value = [
      { id: 'player1', name: '玩家 1', color: '#3b82f6', isLocal: true, isAI: false }
    ];
    step.value = 'players';
  }
};

const addPlayer = () => {
  const available = availableColors.filter(c => !players.value.find(p => p.color === c.color));
  if (available.length > 0) {
    const nextColor = available[0];
    players.value.push({
      id: `player${players.value.length + 1}`,
      name: `玩家 ${players.value.length + 1}`,
      color: nextColor.color,
      isLocal: true,
      isAI: false
    });
  }
};

const removePlayer = (index: number) => {
  if (players.value.length > 2) {
    players.value.splice(index, 1);
  }
};

const updatePlayerColor = (index: number, color: string) => {
  players.value[index].color = color;
};

const confirmPlayers = () => {
  if (players.value.length >= 2) {
    step.value = 'game';
    startGame();
  }
};

const startGame = () => {
  if (!selectedGameType.value || players.value.length < 2) return;
  
  gameStore.setGameType(selectedGameType.value);
  gameStore.setGameMode(selectedMode.value);
  gameStore.setPlayers(players.value);
  router.push('/game');
};

const goToBeta = () => {
  router.push('/beta');
};

const backToMode = () => {
  step.value = 'mode';
  selectedGameType.value = null;
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
          <div class="flex items-center gap-2">
            <button 
              v-for="loc in availableLocales"
              :key="loc.code"
              @click="switchLocale(loc.code)"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                locale === loc.code 
                  ? 'bg-amber-700 text-amber-100' 
                  : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'
              ]"
            >
              {{ loc.label }}
            </button>
          </div>
          <button 
            @click="goToBeta"
            class="group flex items-center gap-2 px-4 py-2 bg-amber-900/20 border border-amber-800/30 hover:border-amber-700/50 rounded-lg transition-all duration-300"
          >
            <span class="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded">BETA</span>
            <span class="text-amber-400 text-sm group-hover:text-amber-300 transition-colors">{{ t('common.beta') }}</span>
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

          <div v-if="step === 'mode'" class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <button 
              @click="selectGameType('single')"
              class="group relative p-6 bg-stone-900/50 border border-stone-800/50 hover:border-amber-800/50 transition-all duration-300"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-amber-900/0 to-amber-900/0 group-hover:from-amber-900/5 group-hover:to-amber-900/10 transition-all duration-300"></div>
              <div class="relative flex items-start gap-4">
                <div class="w-12 h-12 rounded bg-stone-800/50 group-hover:bg-amber-900/30 flex items-center justify-center transition-colors duration-300">
                  <svg class="w-6 h-6 text-stone-500 group-hover:text-amber-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <div class="text-left flex-1">
                  <h3 class="text-stone-200 font-light tracking-wider text-lg mb-1">
                    {{ t('entry.buttons.singlePlayer') }}
                  </h3>
                  <p class="text-stone-600 text-sm font-light">
                    {{ t('entry.descriptions.singlePlayer') }}
                  </p>
                </div>
                <svg class="w-5 h-5 text-stone-700 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            <button 
              @click="selectGameType('hotseat')"
              class="group relative p-6 bg-stone-900/50 border border-stone-800/50 hover:border-amber-800/50 transition-all duration-300"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-amber-900/0 to-amber-900/0 group-hover:from-amber-900/5 group-hover:to-amber-900/10 transition-all duration-300"></div>
              <div class="relative flex items-start gap-4">
                <div class="w-12 h-12 rounded bg-stone-800/50 group-hover:bg-amber-900/30 flex items-center justify-center transition-colors duration-300">
                  <svg class="w-6 h-6 text-stone-500 group-hover:text-amber-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <div class="text-left flex-1">
                  <h3 class="text-stone-200 font-light tracking-wider text-lg mb-1">
                    {{ t('entry.buttons.hotseat') }}
                  </h3>
                  <p class="text-stone-600 text-sm font-light">
                    {{ t('entry.descriptions.hotseat') }}
                  </p>
                </div>
                <svg class="w-5 h-5 text-stone-700 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            <button 
              @click="selectGameType('single')"
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
                    {{ t('entry.descriptions.customMap') }}
                  </p>
                </div>
                <svg class="w-5 h-5 text-stone-700 group-hover:text-amber-700 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>
          </div>

          <div v-if="step === 'players'" class="max-w-2xl mx-auto">
            <div class="mb-8">
              <h2 class="text-stone-200 font-light tracking-wider text-2xl text-center mb-2">{{ t('entry.playerSetup') }}</h2>
              <p class="text-stone-500 text-sm text-center">{{ t('entry.playerSetupHint') }}</p>
            </div>

            <div class="space-y-4 mb-8">
              <div 
                v-for="(player, index) in players" 
                :key="player.id"
                class="flex items-center gap-4 p-4 bg-stone-900/50 border border-stone-800/50 rounded-lg"
              >
                <div 
                  class="w-10 h-10 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: player.color }"
                ></div>
                <input 
                  v-model="player.name"
                  class="flex-1 bg-transparent border-b border-stone-700 text-stone-200 px-2 py-1 focus:border-amber-600 focus:outline-none"
                />
                <div class="flex gap-2">
                  <button 
                    v-for="colorOption in availableColors.filter(c => !players.find((p, i) => i !== index && p.color === c.color))"
                    :key="colorOption.id"
                    @click="updatePlayerColor(index, colorOption.color)"
                    :class="[
                      'w-6 h-6 rounded-full border-2 transition-all',
                      player.color === colorOption.color ? 'border-white scale-110' : 'border-transparent'
                    ]"
                    :style="{ backgroundColor: colorOption.color }"
                  ></button>
                </div>
                <button 
                  v-if="players.length > 2"
                  @click="removePlayer(index)"
                  class="text-stone-500 hover:text-red-400 transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex justify-center gap-4">
              <button 
                v-if="players.length < 6"
                @click="addPlayer"
                class="px-6 py-3 bg-stone-800/50 border border-stone-700/50 hover:border-amber-800/50 text-stone-300 text-sm tracking-wider transition-colors rounded"
              >
                {{ t('entry.addPlayer') }}
              </button>
              <button 
                @click="confirmPlayers"
                :disabled="players.length < 2"
                :class="[
                  'px-6 py-3 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 border border-amber-700/50 text-amber-100 text-sm tracking-wider transition-all rounded',
                  players.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
                ]"
              >
                {{ t('entry.startGame') }}
              </button>
            </div>

            <div class="mt-6 text-center">
              <button @click="backToMode" class="text-stone-500 hover:text-stone-300 text-sm">
                {{ t('entry.back') }}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer class="p-8 flex justify-between items-center text-stone-600">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
            <span class="text-xs tracking-wider">{{ t('common.ready') }}</span>
          </div>
        </div>
        <div class="text-xs tracking-wider text-stone-700">
          <span class="text-stone-600">{{ t('common.esc') }}</span> {{ t('common.menu') }}
          <span class="mx-2 text-stone-800">|</span>
          <span class="text-stone-600">{{ t('common.scroll') }}</span> {{ t('common.zoom') }}
        </div>
      </footer>
    </div>
  </div>
</template>

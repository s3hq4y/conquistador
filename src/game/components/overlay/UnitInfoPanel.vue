<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface UnitInfo {
  id: string;
  q: number;
  r: number;
  owner: string;
  traits: string[];
  hp: number;
}

interface UnitStats {
  hp?: number;
  attack?: number;
  defense?: number;
  movement?: number;
  range?: number;
}

const props = defineProps<{
  unit: UnitInfo | null;
  stats: UnitStats | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const ownerColors: Record<string, string> = {
  neutral: '#808080',
  player: '#268ceb',
  enemy: '#eb3838'
};

const ownerNames: Record<string, string> = {
  neutral: '中立',
  player: '玩家',
  enemy: '敌人'
};

const unitOwnerColor = computed(() => {
  if (!props.unit) return '#808080';
  return ownerColors[props.unit.owner] || '#808080';
});

const unitOwnerName = computed(() => {
  if (!props.unit) return '';
  return ownerNames[props.unit.owner] || props.unit.owner;
});

const hpPercent = computed(() => {
  if (!props.unit || !props.stats) return 0;
  const maxHp = props.stats.hp || 100;
  return Math.round((props.unit.hp / maxHp) * 100);
});
</script>

<template>
  <div v-if="unit && stats" class="absolute right-4 top-20 w-72 bg-stone-950/90 border border-stone-800/50 rounded-lg overflow-hidden z-30">
    <div class="px-4 py-3 border-b border-stone-800/50 flex items-center justify-between">
      <h3 class="text-stone-300 font-light tracking-wider text-sm">{{ t('game.unitInfo') || '单位信息' }}</h3>
      <button @click="emit('close')" class="text-stone-500 hover:text-stone-300 text-lg">×</button>
    </div>
    <div class="p-4">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" :style="{ backgroundColor: unitOwnerColor }">
          ⚔️
        </div>
        <div>
          <div class="text-stone-200 font-medium text-sm">{{ unit.id.slice(0, 16) }}...</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: unitOwnerColor }"></span>
            <span class="text-stone-400 text-xs">{{ unitOwnerName }}</span>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <div class="flex justify-between text-xs text-stone-500 mb-1">
          <span>生命值</span>
          <span class="text-stone-300">{{ unit.hp }} / {{ stats.hp || 100 }}</span>
        </div>
        <div class="h-2 bg-stone-800 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-300"
            :class="{
              'bg-green-500': hpPercent > 60,
              'bg-yellow-500': hpPercent > 30 && hpPercent <= 60,
              'bg-red-500': hpPercent <= 30
            }"
            :style="{ width: `${hpPercent}%` }"
          ></div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="bg-stone-800/50 rounded p-2 text-center">
          <div class="text-amber-400 text-lg">⚔️</div>
          <div class="text-stone-200 font-medium">{{ stats.attack || 0 }}</div>
          <div class="text-stone-500 text-xs">攻击</div>
        </div>
        <div class="bg-stone-800/50 rounded p-2 text-center">
          <div class="text-blue-400 text-lg">🛡️</div>
          <div class="text-stone-200 font-medium">{{ stats.defense || 0 }}</div>
          <div class="text-stone-500 text-xs">防御</div>
        </div>
        <div class="bg-stone-800/50 rounded p-2 text-center">
          <div class="text-green-400 text-lg">🎯</div>
          <div class="text-stone-200 font-medium">{{ stats.range || 1 }}</div>
          <div class="text-stone-500 text-xs">射程</div>
        </div>
      </div>

      <div>
        <div class="text-xs text-stone-500 mb-2">特性</div>
        <div class="flex flex-wrap gap-1">
          <span 
            v-for="trait in unit.traits" 
            :key="trait"
            class="px-2 py-1 bg-stone-800/50 rounded text-xs text-stone-400"
          >
            {{ trait }}
          </span>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-stone-800/50">
        <div class="text-xs text-stone-500">
          位置: Q:{{ unit.q }}, R:{{ unit.r }}
        </div>
      </div>
    </div>
  </div>
</template>

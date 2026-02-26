<script setup lang="ts">
interface CombatResult {
  show: boolean;
  attackerDamage: number;
  defenderDamage: number;
  attackerDied: boolean;
  defenderDied: boolean;
  attackerId: string;
  defenderId: string;
}

defineProps<{
  result: CombatResult | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div v-if="result && result.show" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
    <div class="relative bg-stone-900 border border-amber-700/50 rounded-xl p-6 min-w-[320px] shadow-2xl shadow-amber-900/30 animate-pulse-once">
      <div class="text-center">
        <div class="text-amber-500 text-lg font-medium mb-4">⚔️ 战斗结果 ⚔️</div>
        
        <div class="flex items-center justify-center gap-4 mb-4">
          <div class="text-center">
            <div class="text-red-400 text-2xl font-bold">-{{ result.attackerDamage }}</div>
            <div class="text-stone-500 text-xs mt-1">攻击方受伤</div>
          </div>
          <div class="text-stone-600 text-xl">VS</div>
          <div class="text-center">
            <div class="text-red-400 text-2xl font-bold">-{{ result.defenderDamage }}</div>
            <div class="text-stone-500 text-xs mt-1">防守方受伤</div>
          </div>
        </div>

        <div v-if="result.defenderDied" class="mb-4">
          <div class="text-green-400 text-lg font-medium animate-bounce">🏆 防守方被击败!</div>
        </div>
        <div v-if="result.attackerDied" class="mb-4">
          <div class="text-red-400 text-lg font-medium animate-bounce">💀 攻击方被击败!</div>
        </div>

        <div class="text-stone-500 text-xs mt-4">
          正在继续...
        </div>
      </div>
    </div>
  </div>
</template>

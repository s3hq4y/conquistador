<script setup lang="ts">
defineProps<{
  show: boolean;
}>();
</script>

<template>
  <div v-if="show" class="absolute bottom-20 left-4 w-24 h-32 bg-stone-900/80 border border-stone-700/50 rounded-lg flex flex-col items-center justify-center p-1">
    <div class="text-stone-400 text-[10px] mb-0.5">方向</div>
    <svg viewBox="0 0 60 60" class="w-16 h-20">
      <circle cx="30" cy="30" r="2.5" class="fill-stone-600"/>
      
      <polygon points="52,30 45,27 45,33" class="fill-yellow-500"/>
      <text x="50" y="42" text-anchor="middle" class="fill-yellow-500 text-[6px]">0</text>
      
      <polygon points="45,18 38,21 40,26" class="fill-red-500"/>
      <text x="48" y="14" text-anchor="middle" class="fill-red-500 text-[6px]">1</text>
      
      <polygon points="30,10 26,17 34,17" class="fill-fuchsia-500"/>
      <text x="22" y="14" text-anchor="middle" class="fill-fuchsia-500 text-[6px]">2</text>
      
      <polygon points="8,30 15,27 15,33" class="fill-blue-500"/>
      <text x="4" y="42" text-anchor="middle" class="fill-blue-500 text-[6px]">3</text>
      
      <polygon points="15,42 22,39 20,34" class="fill-cyan-500"/>
      <text x="10" y="50" text-anchor="middle" class="fill-cyan-500 text-[6px]">4</text>
      
      <polygon points="30,50 26,43 34,43" class="fill-green-500"/>
      <text x="30" y="56" text-anchor="middle" class="fill-green-500 text-[6px]">5</text>
    </svg>
  </div>
</template>

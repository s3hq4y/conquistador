<script setup lang="ts">
defineProps<{
  show: boolean;
}>();
</script>

<template>
  <div v-if="show" class="absolute top-14 left-4 z-30">
    <div class="w-16 h-16 rounded-full bg-stone-900/80 border border-stone-700/50 flex items-center justify-center">
      <div class="relative w-12 h-12">
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <text x="50" y="18" text-anchor="middle" class="fill-amber-400 text-xs font-bold">N</text>
          <text x="50" y="88" text-anchor="middle" class="fill-stone-500 text-xs">S</text>
          <text x="88" y="56" text-anchor="middle" class="fill-stone-500 text-xs">E</text>
          <text x="12" y="56" text-anchor="middle" class="fill-stone-500 text-xs">W</text>
          <circle cx="50" cy="50" r="3" class="fill-stone-600"/>
          <polygon points="50,25 45,50 55,50" class="fill-amber-500"/>
        </svg>
      </div>
    </div>
  </div>
</template>

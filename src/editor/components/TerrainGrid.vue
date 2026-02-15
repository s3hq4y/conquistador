<script setup lang="ts">
import type { TerrainTypeDefinition } from '../../core/map';

defineProps<{
  terrains: TerrainTypeDefinition[];
  currentTerrainId: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'add'): void;
}>();

const getTerrainName = (terrain: TerrainTypeDefinition): string => {
  if (typeof terrain.name === 'string') {
    return terrain.name;
  }
  return terrain.name.zh || terrain.name.en || terrain.id;
};
</script>

<template>
  <div class="terrain-panel">
    <div class="terrain-grid">
      <button
        v-for="terrain in terrains"
        :key="terrain.id"
        :class="['terrain-btn', { active: currentTerrainId === terrain.id }]"
        @click="emit('select', terrain.id)"
      >
        <span
          class="terrain-color"
          :style="{ background: terrain.color }"
        ></span>
        <span class="terrain-name">{{ getTerrainName(terrain) }}</span>
      </button>
    </div>
    <button class="add-btn" @click="emit('add')">
      + 添加地形类型
    </button>
  </div>
</template>

<style scoped>
.terrain-panel {
  display: block;
}

.terrain-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
  padding-right: 4px;
}

.terrain-grid::-webkit-scrollbar {
  width: 4px;
}

.terrain-grid::-webkit-scrollbar-track {
  background: var(--editor-bg-tertiary);
  border-radius: 2px;
}

.terrain-grid::-webkit-scrollbar-thumb {
  background: var(--editor-scrollbar-thumb);
  border-radius: 2px;
}

.terrain-btn {
  padding: 6px 8px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  color: var(--editor-text-primary);
  font-size: 11px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: var(--editor-transition);
}

.terrain-btn.active {
  background: var(--editor-accent-bg);
  border-color: var(--editor-accent-border);
}

.terrain-btn:hover {
  background: var(--editor-accent-bg-hover);
}

.terrain-color {
  width: 12px;
  height: 12px;
  border-radius: var(--editor-radius-sm);
  flex-shrink: 0;
}

.terrain-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-btn {
  width: 100%;
  margin-top: 8px;
  padding: 6px;
  background: var(--editor-accent-bg-hover);
  border: 1px dashed var(--editor-accent-border-dashed);
  border-radius: var(--editor-radius-md);
  color: var(--editor-accent-text);
  font-size: 11px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.add-btn:hover {
  background: var(--editor-accent-bg);
}
</style>

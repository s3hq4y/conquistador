<script setup lang="ts">
import type { OwnerTagDefinition } from '../../core/map';

defineProps<{
  owners: OwnerTagDefinition[];
  currentOwnerId: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'add'): void;
}>();

const getOwnerName = (owner: OwnerTagDefinition): string => {
  if (typeof owner.name === 'string') {
    return owner.name;
  }
  return owner.name.zh || owner.name.en || owner.id;
};
</script>

<template>
  <div class="owner-panel">
    <div class="owner-grid">
      <button
        v-for="owner in owners"
        :key="owner.id"
        :class="['owner-btn', { active: currentOwnerId === owner.id }]"
        @click="emit('select', owner.id)"
      >
        <span
          class="owner-color"
          :style="{ background: owner.color }"
        ></span>
        <span class="owner-name">{{ getOwnerName(owner) }}</span>
      </button>
    </div>
    <button class="add-btn" @click="emit('add')">
      + 添加所有者标签
    </button>
  </div>
</template>

<style scoped>
.owner-panel {
  display: block;
}

.owner-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
  padding-right: 4px;
}

.owner-grid::-webkit-scrollbar {
  width: 4px;
}

.owner-grid::-webkit-scrollbar-track {
  background: var(--editor-bg-tertiary);
  border-radius: 2px;
}

.owner-grid::-webkit-scrollbar-thumb {
  background: var(--editor-scrollbar-thumb);
  border-radius: 2px;
}

.owner-btn {
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

.owner-btn.active {
  background: var(--editor-accent-bg);
  border-color: var(--editor-accent-border);
}

.owner-btn:hover {
  background: var(--editor-accent-bg-hover);
}

.owner-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.owner-name {
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

<script setup lang="ts">
import type { EditorTool } from '../EditorSystem';

defineProps<{
  currentTool: EditorTool;
}>();

const emit = defineEmits<{
  (e: 'update:currentTool', tool: EditorTool): void;
}>();

const tools: { id: EditorTool; label: string; icon: string }[] = [
  { id: 'select', label: '选择', icon: '👆' },
  { id: 'paint', label: '绘制', icon: '🖌️' },
  { id: 'fill', label: '填充', icon: '🪣' },
  { id: 'erase', label: '擦除', icon: '🗑️' },
  { id: 'add', label: '添加', icon: '➕' },
  { id: 'drag_paint', label: '拖拽', icon: '✋' },
  { id: 'river', label: '河流', icon: '🌊' }
];

const handleToolClick = (toolId: EditorTool) => {
  emit('update:currentTool', toolId);
};
</script>

<template>
  <div class="section">
    <label class="section-label">工具</label>
    <div class="tool-buttons">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :class="['tool-btn', { active: currentTool === tool.id }]"
        @click="handleToolClick(tool.id)"
      >
        <div class="tool-icon">{{ tool.icon }}</div>
        <div class="tool-label">{{ tool.label }}</div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--editor-text-secondary);
  margin-bottom: 8px;
  display: block;
}

.tool-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.tool-btn {
  padding: 8px 4px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  color: var(--editor-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.tool-btn.active {
  background: var(--editor-accent-bg);
  border-color: var(--editor-accent-border);
  color: var(--editor-accent-text);
}

.tool-btn:hover {
  background: var(--editor-accent-bg-hover);
}

.tool-icon {
  font-size: 16px;
  margin-bottom: 2px;
}

.tool-label {
  font-size: 11px;
}
</style>

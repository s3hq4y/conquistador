<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { EditorTool } from '../EditorSystem';
import type { EdgeType } from '../../core/map';
import { debugConfig } from '../../core/config';

defineProps<{
  currentTool: EditorTool;
}>();

const emit = defineEmits<{
  (e: 'update:currentTool', tool: EditorTool): void;
  (e: 'update:edgeType', type: EdgeType): void;
}>();

const tools: { id: EditorTool; label: string; icon: string }[] = [
  { id: 'select', label: '选择', icon: '👆' },
  { id: 'paint', label: '绘制', icon: '🖌️' },
  { id: 'fill', label: '填充', icon: '🪣' },
  { id: 'erase', label: '擦除', icon: '🗑️' },
  { id: 'add', label: '添加', icon: '➕' },
  { id: 'drag_paint', label: '拖拽', icon: '✋' },
  { id: 'edge', label: '边编辑', icon: '🔗' },
  { id: 'unit', label: '放置单位', icon: '⚔️' }
];

const edgeTypes: { id: EdgeType; label: string; icon: string }[] = [
  { id: 'river', label: '河流', icon: '🌊' },
  { id: 'barrier', label: '屏障', icon: '🚧' },
  { id: 'road', label: '道路', icon: '🛤️' },
  { id: 'wall', label: '城墙', icon: '🏰' }
];

const currentEdgeType = ref<EdgeType>('river');
const showEdgeDropdown = ref(false);

const currentEdgeLabel = computed(() => {
  const found = edgeTypes.find(e => e.id === currentEdgeType.value);
  return found ? found.label : '河流';
});

const handleToolClick = (toolId: EditorTool) => {
  if (debugConfig.editor.editorUI) {
    console.log('ToolButtons.handleToolClick:', toolId);
  }
  emit('update:currentTool', toolId);
};

const handleEdgeTypeSelect = (type: EdgeType) => {
  currentEdgeType.value = type;
  showEdgeDropdown.value = false;
  emit('update:edgeType', type);
};

const toggleEdgeDropdown = () => {
  showEdgeDropdown.value = !showEdgeDropdown.value;
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.edge-type-selector')) {
    showEdgeDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
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

  <div v-if="currentTool === 'edge'" class="section edge-type-section">
    <label class="section-label">边类型</label>
    <div class="edge-type-selector">
      <button
        class="edge-type-main-btn"
        @click="toggleEdgeDropdown"
      >
        <span class="edge-type-icon">{{ edgeTypes.find(e => e.id === currentEdgeType)?.icon }}</span>
        <span class="edge-type-label">{{ currentEdgeLabel }}</span>
        <span class="edge-type-arrow">▼</span>
      </button>
      
      <div v-if="showEdgeDropdown" class="edge-dropdown">
        <button
          v-for="edge in edgeTypes"
          :key="edge.id"
          :class="['edge-option', { selected: currentEdgeType === edge.id }]"
          @click="handleEdgeTypeSelect(edge.id)"
        >
          <span class="edge-option-icon">{{ edge.icon }}</span>
          <span class="edge-option-label">{{ edge.label }}</span>
        </button>
      </div>
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

.edge-type-section {
  margin-top: -8px;
}

.edge-type-selector {
  position: relative;
}

.edge-type-main-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  color: var(--editor-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.edge-type-main-btn:hover {
  background: var(--editor-accent-bg-hover);
}

.edge-type-icon {
  font-size: 16px;
}

.edge-type-label {
  flex: 1;
  text-align: left;
}

.edge-type-arrow {
  font-size: 10px;
  color: var(--editor-text-secondary);
}

.edge-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--editor-bg-primary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  box-shadow: var(--editor-shadow-lg);
  z-index: 100;
  overflow: hidden;
}

.edge-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  color: var(--editor-text-primary);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: var(--editor-transition);
}

.edge-option:hover {
  background: var(--editor-accent-bg-hover);
}

.edge-option.selected {
  background: var(--editor-accent-bg);
  color: var(--editor-accent-text);
}

.edge-option-icon {
  font-size: 16px;
}

.edge-option-label {
  flex: 1;
}
</style>

<script setup lang="ts">
import type { SceneListItem } from '../sceneApi';

defineProps<{
  scenes: SceneListItem[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', sceneId: string): void;
}>();
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h4 class="modal-title">场景列表</h4>
      <div v-if="scenes.length === 0" class="empty-message">
        暂无保存的场景
      </div>
      <div v-else class="scene-list">
        <div
          v-for="scene in scenes"
          :key="scene.id"
          class="scene-item"
          @click="emit('select', scene.id)"
        >
          <div class="scene-name">{{ scene.name }}</div>
          <div class="scene-meta">
            <span>{{ scene.author }}</span>
            <span>{{ new Date(scene.modifiedAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
      <button class="btn btn-secondary" @click="emit('close')">关闭</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--editor-bg-overlay);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: var(--editor-bg-modal);
  border: 1px solid var(--editor-border-primary);
  border-radius: var(--editor-radius-xl);
  padding: 20px;
  max-width: 400px;
  width: 90%;
}

.modal-title {
  margin: 0 0 16px 0;
  color: var(--editor-text-primary);
  font-size: 16px;
}

.empty-message {
  text-align: center;
  color: var(--editor-text-muted);
  padding: 20px;
}

.scene-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.scene-item {
  padding: 12px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  margin-bottom: 8px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.scene-item:hover {
  background: var(--editor-accent-bg-hover);
  border-color: var(--editor-accent-border-dashed);
}

.scene-name {
  color: var(--editor-text-primary);
  font-size: 14px;
  margin-bottom: 4px;
}

.scene-meta {
  display: flex;
  justify-content: space-between;
  color: var(--editor-text-muted);
  font-size: 12px;
}

.btn {
  width: 100%;
  padding: 10px;
  border-radius: var(--editor-radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.btn-secondary {
  background: var(--editor-bg-tertiary);
  border: none;
  color: var(--editor-text-secondary);
}

.btn-secondary:hover {
  background: var(--editor-border-primary);
}
</style>

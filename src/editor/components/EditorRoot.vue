<script setup lang="ts">
import { ref, provide, inject, watch } from 'vue';
import EditorPanel from './EditorPanel.vue';
import BottomNav from './BottomNav.vue';
import { EditorUIStateKey, type EditorUIState } from '../EditorUI';
import { ActivePanelKey, type ActivePanelType } from './editorSymbols';

interface EditorContext {
  state: EditorUIState;
  callbacks: {
    onSave: () => Promise<void>;
    onLoad: (sceneId: string) => Promise<void>;
    onExport: () => void;
    onImport: (file: File) => void;
    onAddTerrain: (terrain: { id: string; name: string; color: string }) => void;
    onAddOwner: (owner: { id: string; name: string; color: string }) => void;
  };
}

const context = inject<EditorContext>(EditorUIStateKey);
if (!context) {
  throw new Error('EditorRoot must be used within EditorUI');
}

provide(EditorUIStateKey, context);

const activePanel = ref<ActivePanelType>('tools');

provide(ActivePanelKey, activePanel);

watch(activePanel, (newPanel) => {
  if (newPanel === 'military') {
    context.state.currentTool.value = 'unit';
  }
});

const editorPanelRef = ref<InstanceType<typeof EditorPanel> | null>(null);

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  editorPanelRef.value?.showToast(message, type);
};

const showSceneListModal = () => {
  editorPanelRef.value?.showSceneListModal();
};

defineExpose({
  showToast,
  showSceneListModal
});
</script>

<template>
  <div class="editor-root">
    <EditorPanel ref="editorPanelRef" />
    <BottomNav
      :active-panel="activePanel"
      @update:activePanel="activePanel = $event"
    />
  </div>
</template>

<style scoped>
.editor-root {
  position: relative;
}
</style>

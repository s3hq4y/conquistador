<script setup lang="ts">
import { ref, watch, inject } from 'vue';
import ToolButtons from './ToolButtons.vue';
import TerrainGrid from './TerrainGrid.vue';
import OwnerGrid from './OwnerGrid.vue';
import SceneListModal from './SceneListModal.vue';
import AddTerrainModal from './AddTerrainModal.vue';
import AddOwnerModal from './AddOwnerModal.vue';
import type { EditorTool, PaintMode } from '../EditorSystem';
import * as sceneApi from '../sceneApi';
import { EditorUIStateKey, type EditorUIState } from '../EditorUI';
import { ActivePanelKey, type ActivePanelRef } from './editorSymbols';
import './editor-vars.css';

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
  throw new Error('EditorPanel must be used within EditorUI');
}

const { state, callbacks } = context;

const activePanel = inject<ActivePanelRef>(ActivePanelKey);
if (!activePanel) {
  throw new Error('EditorPanel must be used within EditorRoot');
}

const activeTab = ref<'terrain' | 'owner'>('terrain');

const showSceneList = ref(false);
const showAddTerrain = ref(false);
const showAddOwner = ref(false);
const scenes = ref<sceneApi.SceneListItem[]>([]);
const toastMessage = ref('');
const toastType = ref<'success' | 'error' | 'info'>('info');

const localSceneName = ref(state.sceneName.value);
const localSceneDescription = ref(state.sceneDescription.value);

watch(() => state.sceneName.value, (val) => { localSceneName.value = val; });
watch(() => state.sceneDescription.value, (val) => { localSceneDescription.value = val; });

const handleToolChange = (tool: EditorTool) => {
  state.currentTool.value = tool;
};

const handleTerrainSelect = (id: string) => {
  state.currentTerrainId.value = id;
};

const handleOwnerSelect = (id: string) => {
  state.currentOwnerId.value = id;
};

const handlePaintModeChange = (mode: PaintMode) => {
  state.paintMode.value = mode;
};

const handleSceneNameChange = () => {
  state.sceneName.value = localSceneName.value;
};

const handleSceneDescChange = () => {
  state.sceneDescription.value = localSceneDescription.value;
};

const handleSave = () => {
  callbacks.onSave();
};

const handleLoad = async () => {
  try {
    scenes.value = await sceneApi.listScenes();
    showSceneList.value = true;
  } catch (error) {
    showToast('获取场景列表失败', 'error');
  }
};

const handleSceneSelect = (sceneId: string) => {
  showSceneList.value = false;
  callbacks.onLoad(sceneId);
};

const handleExport = () => {
  callbacks.onExport();
};

const handleImport = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    callbacks.onImport(file);
  }
  input.value = '';
};

const handleAddTerrain = (terrain: { id: string; name: string; color: string }) => {
  callbacks.onAddTerrain(terrain);
  showAddTerrain.value = false;
};

const handleAddOwner = (owner: { id: string; name: string; color: string }) => {
  callbacks.onAddOwner(owner);
  showAddOwner.value = false;
};

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  toastMessage.value = message;
  toastType.value = type;
  setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
};

defineExpose({
  showToast,
  showSceneListModal: () => { showSceneList.value = true; },
  setScenes: (s: sceneApi.SceneListItem[]) => { scenes.value = s; }
});
</script>

<template>
  <div class="editor-panel">
    <div class="editor-header">
      <span class="editor-icon">🎬</span>
      <h3 class="editor-title">场景编辑器</h3>
    </div>

    <div v-show="activePanel === 'tools'" class="panel-content">
      <ToolButtons
        :current-tool="state.currentTool.value"
        @update:currentTool="handleToolChange"
      />

      <div class="section">
        <label class="section-label">绘制模式</label>
        <div class="paint-mode-buttons">
          <button
            :class="['mode-btn', { active: state.paintMode.value === 'both' }]"
            @click="handlePaintModeChange('both')"
          >全部</button>
          <button
            :class="['mode-btn', { active: state.paintMode.value === 'terrain' }]"
            @click="handlePaintModeChange('terrain')"
          >地形</button>
          <button
            :class="['mode-btn', { active: state.paintMode.value === 'owner' }]"
            @click="handlePaintModeChange('owner')"
          >所有者</button>
        </div>
      </div>

      <div class="section">
        <div class="tab-buttons">
          <button
            :class="['tab-btn', { active: activeTab === 'terrain' }]"
            @click="activeTab = 'terrain'"
          >地形</button>
          <button
            :class="['tab-btn', { active: activeTab === 'owner' }]"
            @click="activeTab = 'owner'"
          >所有者</button>
        </div>

        <TerrainGrid
          v-show="activeTab === 'terrain'"
          :terrains="state.terrains.value"
          :current-terrain-id="state.currentTerrainId.value"
          @select="handleTerrainSelect"
          @add="showAddTerrain = true"
        />

        <OwnerGrid
          v-show="activeTab === 'owner'"
          :owners="state.owners.value"
          :current-owner-id="state.currentOwnerId.value"
          @select="handleOwnerSelect"
          @add="showAddOwner = true"
        />
      </div>
    </div>

    <div v-show="activePanel === 'info'" class="panel-content">
      <div class="section">
        <label class="section-label">场景信息</label>
        <input
          v-model="localSceneName"
          type="text"
          placeholder="场景名称"
          class="input-field"
          @input="handleSceneNameChange"
        >
        <textarea
          v-model="localSceneDescription"
          placeholder="场景描述"
          class="textarea-field"
          @input="handleSceneDescChange"
        ></textarea>
      </div>

      <div class="button-row">
        <button class="btn btn-save" @click="handleSave">💾 保存</button>
        <button class="btn btn-load" @click="handleLoad">📂 加载</button>
      </div>

      <div class="button-row">
        <button class="btn btn-secondary" @click="handleExport">📤 导出</button>
        <label class="btn btn-secondary file-input-label">
          📥 导入
          <input type="file" accept=".json" @change="handleImport">
        </label>
      </div>
    </div>

    <div v-show="activePanel === 'help'" class="panel-content">
      <div class="help-content">
        <div class="shortcut-row">
          <kbd>Q</kbd> 选择
          <kbd>B</kbd> 绘制
          <kbd>G</kbd> 填充
        </div>
        <div class="shortcut-row">
          <kbd>E</kbd> 擦除
          <kbd>A</kbd> 添加
          <kbd>D</kbd> 拖拽绘制
        </div>
        <div class="shortcut-row">
          <kbd>1-9</kbd> 快速选择地形
        </div>
        <div class="version-info">
          <div class="version-title">场景编辑器 v1.0</div>
          <div class="version-desc">使用底部导航切换面板</div>
        </div>
      </div>
    </div>

    <SceneListModal
      v-if="showSceneList"
      :scenes="scenes"
      @close="showSceneList = false"
      @select="handleSceneSelect"
    />

    <AddTerrainModal
      v-if="showAddTerrain"
      @close="showAddTerrain = false"
      @confirm="handleAddTerrain"
    />

    <AddOwnerModal
      v-if="showAddOwner"
      @close="showAddOwner = false"
      @confirm="handleAddOwner"
    />

    <div v-if="toastMessage" :class="['toast', toastType]">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
.editor-panel {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 300px;
  max-height: calc(100vh - 100px);
  background: var(--editor-bg-primary);
  border: 1px solid var(--editor-border-primary);
  border-radius: var(--editor-radius-xl);
  padding: 16px;
  backdrop-filter: var(--editor-blur);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--editor-text-primary);
  box-shadow: var(--editor-shadow-primary);
  z-index: 1000;
  overflow-y: auto;
  overflow-x: hidden;
}

.editor-panel::-webkit-scrollbar {
  width: 6px;
}

.editor-panel::-webkit-scrollbar-track {
  background: var(--editor-scrollbar-track);
  border-radius: var(--editor-radius-sm);
}

.editor-panel::-webkit-scrollbar-thumb {
  background: var(--editor-scrollbar-thumb);
  border-radius: var(--editor-radius-sm);
}

.editor-panel::-webkit-scrollbar-thumb:hover {
  background: var(--editor-scrollbar-thumb-hover);
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--editor-border-secondary);
}

.editor-icon {
  font-size: 20px;
}

.editor-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-content {
  display: block;
}

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

.paint-mode-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.mode-btn {
  padding: 6px 4px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  color: var(--editor-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.mode-btn.active {
  background: var(--editor-accent-bg);
  border-color: var(--editor-accent-border);
  color: var(--editor-accent-text);
}

.mode-btn:hover {
  background: var(--editor-accent-bg-hover);
}

.tab-buttons {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.tab-btn {
  flex: 1;
  padding: 6px 8px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md) var(--editor-radius-md) 0 0;
  color: var(--editor-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.tab-btn.active {
  background: var(--editor-accent-bg);
  color: var(--editor-accent-text);
}

.input-field {
  width: 100%;
  padding: 8px 12px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  color: var(--editor-text-primary);
  font-size: 13px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.textarea-field {
  width: 100%;
  padding: 8px 12px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  color: var(--editor-text-primary);
  font-size: 13px;
  resize: vertical;
  min-height: 60px;
  box-sizing: border-box;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  flex: 1;
  padding: 10px;
  border-radius: var(--editor-radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.btn-save {
  background: var(--editor-success-gradient);
  border: none;
  color: white;
  font-weight: 500;
}

.btn-load {
  background: var(--editor-accent-bg-hover);
  border: 1px solid var(--editor-accent-border-dashed);
  color: var(--editor-accent-text);
}

.btn-secondary {
  background: var(--editor-bg-tertiary);
  border: 1px solid var(--editor-border-primary);
  color: var(--editor-text-secondary);
}

.file-input-label {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.file-input-label input {
  display: none;
}

.help-content {
  font-size: 11px;
  color: var(--editor-text-muted);
  line-height: 1.6;
}

.shortcut-row {
  margin-bottom: 8px;
}

kbd {
  padding: 2px 6px;
  background: var(--editor-bg-secondary);
  border-radius: var(--editor-radius-sm);
  font-size: 10px;
  margin-right: 4px;
}

.version-info {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--editor-border-secondary);
}

.version-title {
  color: var(--editor-text-secondary);
  margin-bottom: 4px;
}

.version-desc {
  color: var(--editor-text-muted);
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: var(--editor-radius-lg);
  font-size: 14px;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.toast.success {
  background: var(--editor-success-bg);
  color: white;
}

.toast.error {
  background: var(--editor-error-bg);
  color: white;
}

.toast.info {
  background: var(--editor-info-bg);
  color: white;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>

import { createApp, ref, type Ref } from 'vue';
import EditorRoot from './components/EditorRoot.vue';
import type { EditorTool, PaintMode } from './EditorSystem';
import type { TerrainTypeDefinition, OwnerTagDefinition } from '../core/map';

export const EditorUIStateKey = Symbol('EditorUIState');

export interface EditorUIState {
  currentTool: Ref<EditorTool>;
  currentTerrainId: Ref<string>;
  currentOwnerId: Ref<string>;
  paintMode: Ref<PaintMode>;
  sceneName: Ref<string>;
  sceneDescription: Ref<string>;
  terrains: Ref<TerrainTypeDefinition[]>;
  owners: Ref<OwnerTagDefinition[]>;
  debugMode: Ref<boolean>;
}

export class EditorUI {
  private app: ReturnType<typeof createApp> | null = null;
  private container: HTMLDivElement | null = null;
  private editorPanelInstance: {
    showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
    showSceneListModal?: () => void;
  } | null = null;
  
  public state: EditorUIState;

  constructor() {
    this.state = {
      currentTool: ref<EditorTool>('paint'),
      currentTerrainId: ref('plains'),
      currentOwnerId: ref('neutral'),
      paintMode: ref<PaintMode>('both'),
      sceneName: ref(''),
      sceneDescription: ref(''),
      terrains: ref<TerrainTypeDefinition[]>([]),
      owners: ref<OwnerTagDefinition[]>([]),
      debugMode: ref<boolean>(false)
    };
  }

  mount(
    container: HTMLElement,
    callbacks: {
      onSave: () => Promise<void>;
      onLoad: (sceneId: string) => Promise<void>;
      onExport: () => void;
      onImport: (file: File) => void;
      onAddTerrain: (terrain: { id: string; name: string; color: string }) => void;
      onAddOwner: (owner: { id: string; name: string; color: string }) => void;
      onDebugModeChange?: (enabled: boolean) => void;
    }
  ): void {
    this.container = document.createElement('div');
    this.container.id = 'editor-vue-ui';
    container.appendChild(this.container);

    this.app = createApp(EditorRoot);

    this.app.provide(EditorUIStateKey, {
      state: this.state,
      callbacks
    });

    const instance = this.app.mount(this.container);
    this.editorPanelInstance = instance as {
      showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
      showSceneListModal?: () => void;
    };
  }

  unmount(): void {
    if (this.app) {
      this.app.unmount();
      this.app = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }

  setTerrains(terrains: TerrainTypeDefinition[]): void {
    this.state.terrains.value = terrains;
  }

  setOwners(owners: OwnerTagDefinition[]): void {
    this.state.owners.value = owners;
  }

  setSceneName(name: string): void {
    this.state.sceneName.value = name;
  }

  setSceneDescription(description: string): void {
    this.state.sceneDescription.value = description;
  }

  getCurrentTool(): EditorTool {
    return this.state.currentTool.value;
  }

  setCurrentTool(tool: EditorTool): void {
    this.state.currentTool.value = tool;
  }

  getCurrentTerrainId(): string {
    return this.state.currentTerrainId.value;
  }

  setCurrentTerrainId(id: string): void {
    this.state.currentTerrainId.value = id;
  }

  getCurrentOwnerId(): string {
    return this.state.currentOwnerId.value;
  }

  setCurrentOwnerId(id: string): void {
    this.state.currentOwnerId.value = id;
  }

  getPaintMode(): PaintMode {
    return this.state.paintMode.value;
  }

  setPaintMode(mode: PaintMode): void {
    this.state.paintMode.value = mode;
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.editorPanelInstance?.showToast) {
      this.editorPanelInstance.showToast(message, type);
    } else {
      console.warn('[EditorUI] Toast not available:', message, type);
    }
  }

  showSceneListModal(): void {
    this.editorPanelInstance?.showSceneListModal?.();
  }

  isDebugMode(): boolean {
    return this.state.debugMode.value;
  }

  setDebugMode(enabled: boolean): void {
    this.state.debugMode.value = enabled;
  }
}

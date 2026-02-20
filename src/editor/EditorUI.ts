import { createApp, ref, type Ref } from 'vue';
import EditorRoot from './components/EditorRoot.vue';
import type { EditorTool, PaintMode } from './EditorSystem';
import type { TerrainTypeDefinition, OwnerTagDefinition, EdgeType } from '../core/map';
import type { Trait, TraitTypeDefinition, UnitStats } from '../core/traits';
import { debugConfig } from '../core/config';

export const EditorUIStateKey = Symbol('EditorUIState');

export interface SelectedUnit {
  id: string;
  q: number;
  r: number;
  owner: string;
  traits: string[];
  hp: number;
  stats: UnitStats;
}

export interface EditorUIState {
  currentTool: Ref<EditorTool>;
  currentTerrainId: Ref<string>;
  currentOwnerId: Ref<string>;
  currentEdgeType: Ref<EdgeType>;
  selectedTraits: Ref<string[]>;
  paintMode: Ref<PaintMode>;
  sceneName: Ref<string>;
  sceneDescription: Ref<string>;
  terrains: Ref<TerrainTypeDefinition[]>;
  owners: Ref<OwnerTagDefinition[]>;
  traits: Ref<Record<string, Trait>>;
  traitTypes: Ref<Record<string, TraitTypeDefinition>>;
  selectedUnit: Ref<SelectedUnit | null>;
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
      currentEdgeType: ref<EdgeType>('river'),
      selectedTraits: ref<string[]>([]),
      paintMode: ref<PaintMode>('both'),
      sceneName: ref(''),
      sceneDescription: ref(''),
      terrains: ref<TerrainTypeDefinition[]>([]),
      owners: ref<OwnerTagDefinition[]>([]),
      traits: ref<Record<string, Trait>>({}),
      traitTypes: ref<Record<string, TraitTypeDefinition>>({}),
      selectedUnit: ref<SelectedUnit | null>(null),
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
      onEdgeTypeChange?: (type: string) => void;
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

  setTraits(traits: Record<string, Trait>): void {
    this.state.traits.value = traits;
  }

  setTraitTypes(traitTypes: Record<string, TraitTypeDefinition>): void {
    this.state.traitTypes.value = traitTypes;
  }

  setSceneName(name: string): void {
    this.state.sceneName.value = name;
  }

  setSceneDescription(description: string): void {
    this.state.sceneDescription.value = description;
  }

  getCurrentTool(): EditorTool {
    const tool = this.state.currentTool.value;
    if (debugConfig.editor.editorUI) {
      console.log('EditorUI.getCurrentTool:', tool);
    }
    return tool;
  }

  setCurrentTool(tool: EditorTool): void {
    if (debugConfig.editor.editorUI) {
      console.log('EditorUI.setCurrentTool:', tool);
    }
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

  getCurrentEdgeType(): EdgeType {
    return this.state.currentEdgeType.value;
  }

  setCurrentEdgeType(type: EdgeType): void {
    this.state.currentEdgeType.value = type;
  }

  getSelectedTraits(): string[] {
    return [...this.state.selectedTraits.value];
  }

  setSelectedTraits(traits: string[]): void {
    this.state.selectedTraits.value = [...traits];
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

  getSelectedUnit(): SelectedUnit | null {
    return this.state.selectedUnit.value;
  }

  setSelectedUnit(unit: SelectedUnit | null): void {
    this.state.selectedUnit.value = unit;
  }

  clearSelectedUnit(): void {
    this.state.selectedUnit.value = null;
  }
}

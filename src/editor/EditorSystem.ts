import { GameSystem, MapSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { EditorUI } from './EditorUI';
import { EditorInputHandler, EditorTools, SceneManager, DebugEdgeSystem } from './systems';
export type { EditorTool, PaintMode } from './systems';

export class EditorSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private editorUI: EditorUI | null = null;
  private inputHandler: EditorInputHandler | null = null;
  private tools: EditorTools | null = null;
  private sceneManager: SceneManager | null = null;
  private debugEdgeSystem: DebugEdgeSystem | null = null;

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    
    this.tools = new EditorTools(this.mapSystem, null);
    this.sceneManager = new SceneManager(this.mapSystem, null);
    this.debugEdgeSystem = new DebugEdgeSystem();
    this.debugEdgeSystem.setMapSystem(this.mapSystem);
    this.debugEdgeSystem.setApp(this.engine.getApplication());
    this.inputHandler = new EditorInputHandler(this.engine, this.mapSystem, this.tools);
    this.inputHandler.setDebugEdgeSystem(this.debugEdgeSystem);
    
    this.inputHandler.setup();
    this.createUI();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.debugEdgeSystem?.dispose();
    this.removeUI();
  }

  getDebugEdgeSystem(): DebugEdgeSystem | null {
    return this.debugEdgeSystem;
  }

  private createUI(): void {
    const uiRoot = document.getElementById('ui');
    if (!uiRoot || !this.mapSystem) return;

    const terrains = this.mapSystem.getAllTerrainTypes();
    const owners = this.mapSystem.getAllOwnerTags();

    this.editorUI = new EditorUI();
    this.editorUI.setTerrains(terrains);
    this.editorUI.setOwners(owners);

    this.tools?.setEditorUI(this.editorUI);
    this.sceneManager?.setEditorUI(this.editorUI);

    this.editorUI.mount(uiRoot, {
      onSave: async () => {
        await this.sceneManager?.saveSceneToServer();
      },
      onLoad: async (sceneId: string) => {
        await this.sceneManager?.loadSceneFromServer(sceneId);
      },
      onExport: () => {
        this.sceneManager?.exportScene();
      },
      onImport: (file: File) => {
        this.sceneManager?.importScene(file);
      },
      onAddTerrain: (terrain) => {
        this.sceneManager?.addTerrainType(terrain);
      },
      onAddOwner: (owner) => {
        this.sceneManager?.addOwnerTag(owner);
      },
      onDebugModeChange: (enabled: boolean) => {
        this.debugEdgeSystem?.setEnabled(enabled);
      }
    });

    this.updateUI();
  }

  private updateUI(): void {
    if (!this.mapSystem || !this.editorUI) return;

    const sceneData = this.mapSystem.getSceneData();
    this.editorUI.setSceneName(sceneData.name);
    this.editorUI.setSceneDescription(sceneData.description);
  }

  private removeUI(): void {
    if (this.editorUI) {
      this.editorUI.unmount();
      this.editorUI = null;
    }
  }

  hideUI(): void {
    if (this.editorUI) {
      this.editorUI.unmount();
      this.editorUI = null;
    }
  }

  showUI(): void {
    if (!this.editorUI) {
      this.createUI();
    }
  }
}

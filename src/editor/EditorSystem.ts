import { GameSystem, MapSystem, EdgeSystem, MovementSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { EditorUI } from './EditorUI';
import { EditorInputHandler, EditorTools, SceneManager, DebugEdgeSystem, EdgeEditorSystem } from './systems';
import { TraitManager } from '../core/traits';
export type { EditorTool, PaintMode } from './systems';

export class EditorSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private editorUI: EditorUI | null = null;
  private inputHandler: EditorInputHandler | null = null;
  private tools: EditorTools | null = null;
  private sceneManager: SceneManager | null = null;
  private debugEdgeSystem: DebugEdgeSystem | null = null;
  private edgeSystem: EdgeSystem | null = null;
  private edgeEditorSystem: EdgeEditorSystem | null = null;
  private traitManager: TraitManager | null = null;

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;

    this.traitManager = new TraitManager();

    if (this.movementSystem) {
      this.movementSystem.setGrid(this.mapSystem.getGrid());
      this.movementSystem.loadFromSceneData(this.mapSystem.getSceneData());
      this.movementSystem.setTraitManager(this.traitManager);
    }
    
    this.tools = new EditorTools(this.mapSystem, this.movementSystem, null);
    this.tools.setTraitManager(this.traitManager);
    this.sceneManager = new SceneManager(this.mapSystem, null);
    this.sceneManager.setTraitManager(this.traitManager);
    
    this.debugEdgeSystem = new DebugEdgeSystem();
    this.debugEdgeSystem.setMapSystem(this.mapSystem);
    this.debugEdgeSystem.setApp(this.engine.getApplication());
    
    this.edgeSystem = new EdgeSystem(this.engine);
    this.edgeSystem.setMapSystem(this.mapSystem);
    
    this.sceneManager.setEdgeSystem(this.edgeSystem);
    this.sceneManager.setMovementSystem(this.movementSystem);
    
    this.edgeEditorSystem = new EdgeEditorSystem();
    this.edgeEditorSystem.setMapSystem(this.mapSystem);
    this.edgeEditorSystem.setEdgeSystem(this.edgeSystem);
    
    this.inputHandler = new EditorInputHandler(this.engine, this.mapSystem, this.tools);
    this.inputHandler.setDebugEdgeSystem(this.debugEdgeSystem);
    this.inputHandler.setEdgeEditorSystem(this.edgeEditorSystem);
    
    this.inputHandler.setup();
    this.createUI();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.debugEdgeSystem?.dispose();
    this.edgeEditorSystem?.dispose();
    this.edgeSystem?.dispose();
    this.removeUI();
  }

  getDebugEdgeSystem(): DebugEdgeSystem | null {
    return this.debugEdgeSystem;
  }

  getEdgeSystem(): EdgeSystem | null {
    return this.edgeSystem;
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
      },
      onEdgeTypeChange: (type: string) => {
        this.edgeEditorSystem?.setCurrentEdgeType(type);
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

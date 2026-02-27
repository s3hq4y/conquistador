import { GameSystem } from '../../core/systems';
import type { GameEngine } from '../../core/engine';
import { MapSystem, MovementSystem, EdgeSystem } from '../../core/systems';
import type { SceneData } from '../../core/map';
import type { OwnerStates } from '../../stores/game';
import { TraitManager } from '../../core/traits/TraitManager';
import { SCENE_BASE_PATH } from '../../core/config';
import { debug } from '../../core/utils/debug';

export class SceneLoader extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private edgeSystem: EdgeSystem | null = null;
  private traitManager: TraitManager | null = null;
  private sceneId: string = 'example_battlefield';

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;
    this.edgeSystem = this.engine.getSystems().find(s => s instanceof EdgeSystem) as EdgeSystem;

    const editorSystem = this.engine.getSystems().find(s => s.constructor.name === 'EditorSystem');
    if (editorSystem) {
      const traitManagerProp = (editorSystem as any).traitManager;
      if (traitManagerProp) {
        this.traitManager = traitManagerProp;
      }
    }

    if (!this.traitManager) {
      this.traitManager = new TraitManager();
      debug.scene('Created new TraitManager');
    }
  }

  setTraitManager(traitManager: TraitManager): void {
    this.traitManager = traitManager;
  }

  getTraitManager(): TraitManager | null {
    return this.traitManager;
  }

  async loadDemoScene(sceneId?: string): Promise<void> {
    if (!this.mapSystem) return;

    const targetSceneId = sceneId ?? this.sceneId;

    try {
      const { sceneData, ownerStates } = await this.loadSceneFromFolder(targetSceneId);

      const traitsData = await fetch(`${SCENE_BASE_PATH}/${targetSceneId}/traits.json`).then(r => r.json());
      if (this.traitManager) {
        this.traitManager.loadTraitData(traitsData);
        debug.scene('Traits loaded:', Object.keys(traitsData.traits).length, 'traits');
        
        if (this.movementSystem) {
          this.movementSystem.setTraitManager(this.traitManager);
          debug.scene('TraitManager set to MovementSystem');
        }
      }

      this.mapSystem.loadSceneData(sceneData);

      if (this.edgeSystem && sceneData.edges) {
        this.edgeSystem.loadFromInstances(sceneData.edges);
      }

      if (this.movementSystem && sceneData.units) {
        this.movementSystem.loadFromSceneData(sceneData);
      }

      if (window.__setOwnerStates) {
        window.__setOwnerStates(ownerStates);
      }

      debug.scene('Demo scene loaded:', sceneData.name, 'edges:', sceneData.edges?.length, 'units:', sceneData.units?.length);
    } catch (error) {
      debug.scene('Failed to load demo scene:', error);
    }
  }

  private async loadSceneFromFolder(sceneId: string): Promise<{ sceneData: SceneData; ownerStates: OwnerStates }> {
    const basePath = `${SCENE_BASE_PATH}/${sceneId}`;

    debug.scene('loadSceneFromFolder: loading from', basePath);

    const [manifest, terrainTypes, ownerTags, tiles, edges, units, terrainGroups, ownerStates, edgeTypes] = await Promise.all([
      fetch(`${basePath}/manifest.json`).then(r => r.json()),
      fetch(`${basePath}/terrain_types.json`).then(r => r.json()),
      fetch(`${basePath}/owner_tags.json`).then(r => r.json()),
      fetch(`${basePath}/tiles.json`).then(r => r.json()),
      fetch(`${basePath}/edges.json`).then(r => r.json()).catch(() => []),
      fetch(`${basePath}/units.json`).then(r => r.json()).catch(() => []),
      fetch(`${basePath}/terrain_groups.json`).then(r => r.json()).catch(() => null),
      fetch(`${basePath}/owner_states.json`).then(r => r.json()).catch(() => ({})),
      fetch(`${basePath}/edge_types.json`).then(r => r.json()).catch(() => ({}))
    ]);

    debug.scene('loadSceneFromFolder: loaded', tiles.length, 'tiles,', edges.length, 'edges');

    const sceneData: SceneData = {
      version: manifest.version,
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      createdAt: manifest.createdAt,
      modifiedAt: manifest.modifiedAt,
      settings: manifest.settings,
      terrainTypes: terrainTypes as any,
      ownerTags: ownerTags as any,
      tiles: tiles as any[],
      edges: edges as any[],
      units: units as any[],
      terrainGroups: terrainGroups as any,
      edgeTypes: edgeTypes as any
    };

    return { sceneData, ownerStates: ownerStates as OwnerStates };
  }

  setSceneId(sceneId: string): void {
    this.sceneId = sceneId;
  }

  getSceneId(): string {
    return this.sceneId;
  }

  update(_dt: number): void {
  }

  dispose(): void {
  }
}

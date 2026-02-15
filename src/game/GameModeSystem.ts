import { GameSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { MapSystem } from '../core/systems';
import type { SceneData, TerrainTypeInstance, OwnerTagInstance, TileInstance } from '../core/map';
import type { OwnerStates } from '../stores/game';

declare global {
  interface Window {
    __setOwnerStates?: (states: OwnerStates) => void;
  }
}

export class GameModeSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    await this.loadDemoScene();
  }

  update(_dt: number): void {
  }

  dispose(): void {
  }

  private async loadDemoScene(): Promise<void> {
    if (!this.mapSystem) return;

    try {
      const { sceneData, ownerStates } = await this.loadSceneFromFolder('example_battlefield');
      this.mapSystem.loadSceneData(sceneData);
      
      if (window.__setOwnerStates) {
        window.__setOwnerStates(ownerStates);
      }
      
      console.log('Demo scene loaded:', sceneData.name);
    } catch (error) {
      console.error('Failed to load demo scene:', error);
    }
  }

  private async loadSceneFromFolder(sceneId: string): Promise<{ sceneData: SceneData; ownerStates: OwnerStates }> {
    const basePath = `/game_saves/${sceneId}`;
    
    const [manifest, terrainTypes, ownerTags, tiles, ownerStates] = await Promise.all([
      fetch(`${basePath}/manifest.json`).then(r => r.json()),
      fetch(`${basePath}/terrain_types.json`).then(r => r.json()),
      fetch(`${basePath}/owner_tags.json`).then(r => r.json()),
      fetch(`${basePath}/tiles.json`).then(r => r.json()),
      fetch(`${basePath}/owner_states.json`).then(r => r.json()).catch(() => ({}))
    ]);

    const sceneData: SceneData = {
      version: manifest.version,
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      createdAt: manifest.createdAt,
      modifiedAt: manifest.modifiedAt,
      settings: manifest.settings,
      terrainTypes: terrainTypes as Record<string, TerrainTypeInstance>,
      ownerTags: ownerTags as Record<string, OwnerTagInstance>,
      tiles: tiles as TileInstance[]
    };

    return { sceneData, ownerStates: ownerStates as OwnerStates };
  }
}

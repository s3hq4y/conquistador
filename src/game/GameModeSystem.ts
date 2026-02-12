import { GameSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { MapSystem } from '../core/systems';
import { ScenarioLoader, type LoadedScenario } from '../core/map/ScenarioLoader';
import type { TileInstance, TerrainTypeDefinition } from '../core/map/ScenarioTypes';
import { useGameStore } from '../stores/game';

declare global {
  interface Window {
    __initializeGameState?: (scenario: LoadedScenario) => void;
  }
}

export class GameModeSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private scenario: LoadedScenario | null = null;

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
    this.scenario = null;
  }

  private async loadDemoScene(): Promise<void> {
    if (!this.mapSystem) return;

    try {
      this.scenario = await ScenarioLoader.loadScenario('example_battlefield');
      
      this.mapSystem.loadSceneData({
        version: this.scenario.meta.version || '1.0.0',
        id: this.scenario.meta.id,
        name: this.scenario.meta.name,
        description: this.scenario.meta.description,
        author: this.scenario.meta.authors?.join(', ') || 'Unknown',
        createdAt: '',
        modifiedAt: '',
        settings: this.scenario.settings,
        terrainTypes: this.scenario.terrainTypes,
        ownerTags: this.scenario.countries.countries.map(c => ({
          id: c.id,
          name: c.name,
          nameZh: c.shortName || c.name,
          color: c.color,
          description: '',
          icon: '',
          isPlayer: c.id === 'player',
          isAI: c.id !== 'player' && c.id !== 'neutral'
        })),
        tiles: this.scenario.tiles
      });

      this.initializeGameState(this.scenario);
      
      console.log('Demo scene loaded:', this.scenario.meta.name);
    } catch (error) {
      console.error('Failed to load demo scene:', error);
    }
  }

  private initializeGameState(scenario: LoadedScenario): void {
    const gameStore = useGameStore();
    
    gameStore.initializeCountriesState(scenario.countries.countries);
    
    console.log('Game state initialized with countries:', Object.keys(gameStore.countries));
  }

  getScenario(): LoadedScenario | null {
    return this.scenario;
  }

  getTerrainTypes(): TerrainTypeDefinition[] {
    return this.scenario?.terrainTypes || [];
  }

  getTiles(): TileInstance[] {
    return this.scenario?.tiles || [];
  }
}

import { GameSystem } from './GameSystem';
import { HexGrid } from '../core/HexGrid';
import type { TerrainType } from '../core/Tile';
import type { GameEngine } from '../engine/GameEngine';
import { HexTile } from '../components/HexTile';

interface MapConfig {
  radius: number;
  hexSize: number;
  terrainProbabilities: Record<TerrainType, number>;
}

export class MapSystem extends GameSystem {
  private grid: HexGrid;
  private config: MapConfig;
  private tileEntities: Map<string, HexTile> = new Map();

  constructor(engine: GameEngine, config?: Partial<MapConfig>) {
    super(engine);
    this.config = {
      radius: config?.radius ?? 10,
      hexSize: config?.hexSize ?? 50,
      terrainProbabilities: config?.terrainProbabilities ?? {
        PLAINS: 0.4,
        MOUNTAIN: 0.15,
        DESERT: 0.15,
        SHALLOW_SEA: 0.15,
        DEEP_SEA: 0.1,
        BARRIER_MOUNTAIN: 0.05
      }
    };
    this.grid = new HexGrid(this.config.radius, this.config.hexSize);
  }

  initialize(): void {
    this.generateMap();
    this.createTileEntities();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.tileEntities.clear();
  }

  private createTileEntities(): void {
    const app = this.engine.getApplication();
    const renderer = this.engine.getRenderer();
    const tileLayer = renderer.getTileLayer();
    const tiles = this.grid.getTiles();

    for (const tile of tiles) {
      const hexTile = new HexTile(app, tile, this.config.hexSize);
      const pos = this.grid.hexToPixel(tile.q, tile.r);
      hexTile.setPosition(pos.x, pos.y);
      tileLayer.addChild(hexTile.getEntity());
      this.tileEntities.set(tile.getKey(), hexTile);
    }
  }

  private generateMap(): void {
    this.grid.generate();

    const tiles = this.grid.getTiles();
    for (const tile of tiles) {
      tile.terrain = this.pickTerrain();
      tile.owner = this.pickOwner(tile.q);
    }
  }

  private pickTerrain(): TerrainType {
    const rand = Math.random();
    let cumulative = 0;
    for (const [terrain, probability] of Object.entries(this.config.terrainProbabilities)) {
      cumulative += probability;
      if (rand <= cumulative) {
        return terrain as TerrainType;
      }
    }
    return 'PLAINS';
  }

  private pickOwner(q: number): string {
    if (q < -3) return 'Enemy';
    if (q > 3) return 'Neutral';
    return 'Player';
  }

  getGrid(): HexGrid {
    return this.grid;
  }

  getTileEntities(): Map<string, HexTile> {
    return this.tileEntities;
  }
}

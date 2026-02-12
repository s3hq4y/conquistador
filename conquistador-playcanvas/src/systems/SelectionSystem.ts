import { GameSystem } from './GameSystem';
import type { GameEngine } from '../engine/GameEngine';
import { Tile } from '../core/Tile';
import { MapSystem } from './MapSystem';

export class SelectionSystem extends GameSystem {
  private selectedTile: Tile | null = null;
  private hoveredTile: Tile | undefined = undefined;

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.setupInputListeners();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.selectedTile = null;
    this.hoveredTile = undefined;
  }

  private setupInputListeners(): void {
    const eventBus = this.engine.getEventBus();

    eventBus.on('mousemove', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleHover(e);
    });

    eventBus.on('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      if (e.button === 0) {
        this.handleClick(e);
      }
    });
  }

  private handleHover(e: MouseEvent): void {
    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    
    const mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem | undefined;
    if (!mapSystem) return;

    const grid = mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);
    const tile = grid.getTile(hexPos.q, hexPos.r);

    if (tile !== this.hoveredTile) {
      if (this.hoveredTile) {
        this.updateTileVisual(this.hoveredTile, false);
      }
      this.hoveredTile = tile;
      if (tile) {
        this.updateTileVisual(tile, true);
      }
    }
  }

  private handleClick(_e: MouseEvent): void {
    if (this.hoveredTile) {
      if (this.selectedTile) {
        this.updateTileVisual(this.selectedTile, false);
      }
      this.selectedTile = this.hoveredTile;
      this.updateTileVisual(this.selectedTile, true);
      
      console.log('Selected tile:', this.selectedTile.q, this.selectedTile.r, this.selectedTile.terrain);
    }
  }

  private updateTileVisual(tile: Tile, isHighlighted: boolean): void {
    const mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem | undefined;
    if (!mapSystem) return;

    const tileEntities = mapSystem.getTileEntities();
    const hexTile = tileEntities.get(tile.getKey());
    
    if (hexTile) {
      hexTile.setSelected(isHighlighted);
    }
  }

  getSelectedTile(): Tile | null {
    return this.selectedTile;
  }
}

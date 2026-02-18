import type { MapSystem } from '../../core/systems';
import type { EdgeSystem } from '../../core/systems';
import type { EdgeType } from '../../core/map';
import { Tile } from '../../core/map';
import { debugConfig } from '../../core/config';

export class EdgeEditorSystem {
  private mapSystem: MapSystem | null = null;
  private edgeSystem: EdgeSystem | null = null;
  private enabled: boolean = false;
  private selectedTiles: Tile[] = [];
  private currentEdgeType: EdgeType = 'river';

  constructor() {
  }

  setMapSystem(mapSystem: MapSystem | null): void {
    this.mapSystem = mapSystem;
  }

  setEdgeSystem(edgeSystem: EdgeSystem | null): void {
    this.edgeSystem = edgeSystem;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearSelection();
    }
  }

  getCurrentEdgeType(): EdgeType {
    return this.currentEdgeType;
  }

  setCurrentEdgeType(type: EdgeType): void {
    this.currentEdgeType = type;
  }

  handleTileClick(q: number, r: number): boolean {
    if (!this.enabled || !this.mapSystem || !this.edgeSystem) {
      if (debugConfig.editor.edgeSystem) {
        console.warn('[EdgeEditorSystem] Not ready:', { enabled: this.enabled, hasMapSystem: !!this.mapSystem, hasEdgeSystem: !!this.edgeSystem });
      }
      return false;
    }

    const grid = this.mapSystem.getGrid();
    const tile = grid.getTile(q, r);
    
    if (!tile) {
      if (debugConfig.editor.edgeSystem) {
        console.warn('[EdgeEditorSystem] No tile at:', q, r);
      }
      return false;
    }

    if (debugConfig.editor.edgeSystem) {
      console.log('[EdgeEditorSystem] Tile clicked:', q, r, 'Selected tiles:', this.selectedTiles.length);
    }

    if (this.selectedTiles.length === 0) {
      this.selectedTiles.push(tile);
      this.highlightTile(tile, true);
      return true;
    } else if (this.selectedTiles.length === 1) {
      const firstTile = this.selectedTiles[0];
      
      if (firstTile.q === q && firstTile.r === r) {
        this.highlightTile(firstTile, false);
        this.selectedTiles = [];
        return true;
      }

      if (grid.areNeighbors(firstTile, tile)) {
        this.selectedTiles.push(tile);
        this.highlightTile(tile, true);
        
        if (debugConfig.editor.edgeSystem) {
          console.log('[EdgeEditorSystem] Adding edge between:', firstTile.getKey(), tile.getKey());
        }
        this.edgeSystem.toggleEdge(firstTile, tile, this.currentEdgeType);
        
        setTimeout(() => {
          this.clearSelection();
        }, 200);
        
        return true;
      } else {
        this.highlightTile(firstTile, false);
        this.selectedTiles = [tile];
        this.highlightTile(tile, true);
        return true;
      }
    } else {
      this.clearSelection();
      this.selectedTiles.push(tile);
      this.highlightTile(tile, true);
      return true;
    }
  }

  private highlightTile(tile: Tile, highlight: boolean): void {
    if (!this.mapSystem) return;
    
    const tileEntities = this.mapSystem.getTileEntities();
    const hexTile = tileEntities.get(tile.getKey());
    
    if (hexTile) {
      hexTile.setSelected(highlight);
    }
  }

  clearSelection(): void {
    this.selectedTiles.forEach(tile => this.highlightTile(tile, false));
    this.selectedTiles = [];
  }

  dispose(): void {
    this.clearSelection();
  }
}

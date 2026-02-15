import type { MapSystem } from '../../core/systems';
import type { EditorTool, PaintMode } from './types';
import type { EditorUI } from '../EditorUI';

export class EditorTools {
  private mapSystem: MapSystem | null;
  private editorUI: EditorUI | null;
  private selectedTiles: Set<string> = new Set();

  constructor(mapSystem: MapSystem | null, editorUI: EditorUI | null) {
    this.mapSystem = mapSystem;
    this.editorUI = editorUI;
  }

  setMapSystem(mapSystem: MapSystem | null): void {
    this.mapSystem = mapSystem;
  }

  setEditorUI(editorUI: EditorUI | null): void {
    this.editorUI = editorUI;
  }

  getCurrentTool(): EditorTool {
    return this.editorUI?.getCurrentTool() ?? 'paint';
  }

  setCurrentTool(tool: EditorTool): void {
    this.editorUI?.setCurrentTool(tool);
  }

  getCurrentTerrainId(): string {
    return this.editorUI?.getCurrentTerrainId() ?? 'plains';
  }

  setCurrentTerrainId(id: string): void {
    this.editorUI?.setCurrentTerrainId(id);
  }

  getCurrentOwnerId(): string {
    return this.editorUI?.getCurrentOwnerId() ?? 'neutral';
  }

  getPaintMode(): PaintMode {
    return this.editorUI?.getPaintMode() ?? 'both';
  }

  selectTile(q: number, r: number, addToSelection: boolean): void {
    const tileKey = `${q},${r}`;

    if (!addToSelection) {
      this.selectedTiles.clear();
    }

    if (this.selectedTiles.has(tileKey)) {
      this.selectedTiles.delete(tileKey);
    } else {
      this.selectedTiles.add(tileKey);
    }
  }

  deleteSelectedTiles(): void {
    if (!this.mapSystem) return;

    for (const tileKey of this.selectedTiles) {
      const [q, r] = tileKey.split(',').map(Number);
      this.mapSystem.removeTileAt(q, r);
    }
    this.selectedTiles.clear();
  }

  paintAtPosition(q: number, r: number): void {
    if (!this.mapSystem) return;

    const tool = this.getCurrentTool();
    if (tool === 'erase') {
      this.eraseTile(q, r);
      return;
    }

    const paintMode = this.getPaintMode();
    const terrainId = this.getCurrentTerrainId();
    const ownerId = this.getCurrentOwnerId();

    if (paintMode === 'both' || paintMode === 'terrain') {
      this.mapSystem.updateTileTerrain(q, r, terrainId);
    }
    if (paintMode === 'both' || paintMode === 'owner') {
      this.mapSystem.updateTileOwner(q, r, ownerId);
    }
  }

  fillArea(startQ: number, startR: number): void {
    if (!this.mapSystem) return;

    const grid = this.mapSystem.getGrid();
    const startTile = grid.getTile(startQ, startR);
    if (!startTile) return;

    const originalTerrain = startTile.terrain;
    const originalOwner = startTile.owner;
    const newTerrain = this.getCurrentTerrainId();
    const newOwner = this.getCurrentOwnerId();
    const paintMode = this.getPaintMode();

    if (paintMode === 'both' || paintMode === 'terrain') {
      if (originalTerrain === newTerrain) return;
    }
    if (paintMode === 'owner') {
      if (originalOwner === newOwner) return;
    }

    const visited = new Set<string>();
    const queue: [number, number][] = [[startQ, startR]];
    const directions = [
      [1, 0], [0, 1], [-1, 1],
      [-1, 0], [0, -1], [1, -1]
    ];

    while (queue.length > 0) {
      const [q, r] = queue.shift()!;
      const key = `${q},${r}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const tile = grid.getTile(q, r);
      if (!tile) continue;

      const matchesTerrain = tile.terrain === originalTerrain;
      const matchesOwner = tile.owner === originalOwner;

      let shouldFill = false;
      if (paintMode === 'terrain' && matchesTerrain) shouldFill = true;
      else if (paintMode === 'owner' && matchesOwner) shouldFill = true;
      else if (paintMode === 'both' && matchesTerrain && matchesOwner) shouldFill = true;

      if (!shouldFill) continue;

      if (paintMode === 'both' || paintMode === 'terrain') {
        this.mapSystem.updateTileTerrain(q, r, newTerrain);
      }
      if (paintMode === 'both' || paintMode === 'owner') {
        this.mapSystem.updateTileOwner(q, r, newOwner);
      }

      for (const [dq, dr] of directions) {
        queue.push([q + dq, r + dr]);
      }
    }
  }

  eraseTile(q: number, r: number): void {
    if (!this.mapSystem) return;
    this.mapSystem.removeTileAt(q, r);
  }

  addTileAtPosition(q: number, r: number): void {
    if (!this.mapSystem) return;

    const grid = this.mapSystem.getGrid();
    const existingTile = grid.getTile(q, r);
    if (existingTile) return;

    const terrainId = this.getCurrentTerrainId();
    const ownerId = this.getCurrentOwnerId();
    this.mapSystem.addTileAt(q, r);
    this.mapSystem.updateTileTerrain(q, r, terrainId);
    this.mapSystem.updateTileOwner(q, r, ownerId);
  }
}

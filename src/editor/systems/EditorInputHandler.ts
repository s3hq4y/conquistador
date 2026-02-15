import type { GameEngine } from '../../core/engine';
import type { MapSystem } from '../../core/systems';
import type { EditorTools } from './EditorTools';
import type { EditorTool } from './types';

export class EditorInputHandler {
  private engine: GameEngine;
  private mapSystem: MapSystem | null;
  private tools: EditorTools | null;
  
  private isPainting: boolean = false;
  private lastPaintedTile: string | null = null;
  private hoveredTileKey: string | null = null;

  constructor(engine: GameEngine, mapSystem: MapSystem | null, tools: EditorTools | null) {
    this.engine = engine;
    this.mapSystem = mapSystem;
    this.tools = tools;
  }

  setTools(tools: EditorTools | null): void {
    this.tools = tools;
  }

  setMapSystem(mapSystem: MapSystem | null): void {
    this.mapSystem = mapSystem;
  }

  setup(): void {
    const eventBus = this.engine.getEventBus();

    eventBus.on('mousemove', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseMove(e);
    });

    eventBus.on('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });

    eventBus.on('mouseup', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseUp(e);
    });

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.mapSystem || !this.mapSystem.isCustomMode()) return;

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);
    const tileKey = `${hexPos.q},${hexPos.r}`;

    if (tileKey !== this.hoveredTileKey) {
      this.hoveredTileKey = tileKey;
    }

    if (this.isPainting && this.tools && (this.tools.getCurrentTool() === 'paint' || this.tools.getCurrentTool() === 'drag_paint' || this.tools.getCurrentTool() === 'erase')) {
      this.paintAtPosition(hexPos.q, hexPos.r);
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.mapSystem || !this.mapSystem.isCustomMode()) return;
    if (!this.tools) return;
    if (e.button !== 0) return;

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);

    const tool = this.tools.getCurrentTool();

    if (this.tools.getCurrentTool() === 'select') {
      this.tools.selectTile(hexPos.q, hexPos.r, e.ctrlKey || e.metaKey);
    } else if (tool === 'paint' || tool === 'drag_paint' || tool === 'erase') {
      this.isPainting = true;
      this.lastPaintedTile = null;
      if (tool === 'paint' || tool === 'erase') {
        this.paintAtPosition(hexPos.q, hexPos.r);
      }
    } else if (tool === 'fill') {
      this.tools.fillArea(hexPos.q, hexPos.r);
    } else if (tool === 'add') {
      this.tools.addTileAtPosition(hexPos.q, hexPos.r);
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isPainting = false;
    this.lastPaintedTile = null;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.mapSystem || !this.mapSystem.isCustomMode()) return;
    if (!this.tools) return;

    const toolKeys: Record<string, EditorTool> = {
      'q': 'select',
      'b': 'paint',
      'g': 'fill',
      'e': 'erase',
      'a': 'add',
      'd': 'drag_paint'
    };

    const tool = toolKeys[e.key.toLowerCase()];
    if (tool) {
      this.tools.setCurrentTool(tool);
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      const terrains = this.mapSystem.getAllTerrainTypes();
      if (num <= terrains.length) {
        this.tools.setCurrentTerrainId(terrains[num - 1].id);
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.tools.deleteSelectedTiles();
    }
  }

  private paintAtPosition(q: number, r: number): void {
    if (!this.tools) return;

    const tileKey = `${q},${r}`;
    if (tileKey === this.lastPaintedTile) return;
    this.lastPaintedTile = tileKey;

    this.tools.paintAtPosition(q, r);
  }
}

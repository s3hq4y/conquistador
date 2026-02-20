import * as pc from 'playcanvas';
import { GameSystem } from './GameSystem';
import type { GameEngine } from '../engine';
import { MovementSystem, UnitInstance } from './MovementSystem';
import { MapSystem } from './MapSystem';
import type { SceneData } from '../map';

export class UnitRenderSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private unitEntities: Map<string, pc.Entity> = new Map();
  private unitMovesText: Map<string, pc.Entity> = new Map();
  private app: pc.Application | null = null;
  private unitLayer: pc.Entity | null = null;
  private selectedUnitId: string | null = null;
  private reachableTiles: Set<string> = new Set();

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.app = this.engine.getApplication();
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;

    if (this.mapSystem) {
      this.unitLayer = new pc.Entity('UnitLayer');
      const renderer = this.engine.getRenderer();
      const root = renderer.getTileLayer();
      root.addChild(this.unitLayer);
    }

    const eventBus = this.engine.getEventBus();
    eventBus.on('unit:added', (...args: unknown[]) => this.onUnitAdded(args[0] as UnitInstance));
    eventBus.on('unit:removed', (...args: unknown[]) => this.onUnitRemoved(args[0] as UnitInstance));
    eventBus.on('unit:moved', (...args: unknown[]) => this.onUnitMoved(args[0] as { unit: UnitInstance; from: { q: number; r: number }; to: { q: number; r: number } }));
    eventBus.on('units:movesReset', () => this.onMovesReset());
    eventBus.on('map:loaded', (...args: unknown[]) => this.onMapLoaded(args[0] as SceneData));

    this.renderAllUnits();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    const eventBus = this.engine.getEventBus();
    eventBus.off('unit:added', (...args: unknown[]) => this.onUnitAdded(args[0] as UnitInstance));
    eventBus.off('unit:removed', (...args: unknown[]) => this.onUnitRemoved(args[0] as UnitInstance));
    eventBus.off('unit:moved', (...args: unknown[]) => this.onUnitMoved(args[0] as { unit: UnitInstance; from: { q: number; r: number }; to: { q: number; r: number } }));
    eventBus.off('units:movesReset', () => this.onMovesReset());
    eventBus.off('map:loaded', (...args: unknown[]) => this.onMapLoaded(args[0] as SceneData));

    this.unitEntities.forEach(entity => entity.destroy());
    this.unitEntities.clear();
    this.unitLayer?.destroy();
  }

  private onMapLoaded(_sceneData: SceneData): void {
    this.clearAllUnits();
    this.renderAllUnits();
  }

  private clearAllUnits(): void {
    this.unitEntities.forEach(entity => entity.destroy());
    this.unitEntities.clear();
    this.unitMovesText.clear();
  }

  private onUnitAdded(unit: UnitInstance): void {
    this.renderUnit(unit);
  }

  private onUnitRemoved(unit: UnitInstance): void {
    const entity = this.unitEntities.get(unit.id);
    if (entity) {
      entity.destroy();
      this.unitEntities.delete(unit.id);
      this.unitMovesText.delete(unit.id);
    }
  }

  private onUnitMoved(data: { unit: UnitInstance; from: { q: number; r: number }; to: { q: number; r: number } }): void {
    const entity = this.unitEntities.get(data.unit.id);
    if (entity && this.mapSystem) {
      const grid = this.mapSystem.getGrid();
      const pos = grid.hexToPixel(data.to.q, data.to.r);
      entity.setLocalPosition(pos.x, 5, pos.y);
    }
    this.updateUnitMovesDisplay(data.unit.id);
  }

  private onMovesReset(): void {
    this.clearHighlights();
    this.updateAllUnitMovesDisplay();
  }

  private updateUnitMovesDisplay(unitId: string): void {
    if (!this.movementSystem) return;
    
    const movesText = this.unitMovesText.get(unitId);
    
    if (movesText && movesText.element) {
      const moves = this.movementSystem.getUnitMoves(unitId);
      const maxMoves = this.movementSystem.getUnitMaxMoves(unitId);
      movesText.element.text = `${moves}/${maxMoves}`;
    }
  }

  private updateAllUnitMovesDisplay(): void {
    if (!this.movementSystem) return;
    
    const units = this.movementSystem.getUnits();
    for (const unit of units) {
      this.updateUnitMovesDisplay(unit.id);
    }
  }

  renderAllUnits(): void {
    if (!this.movementSystem) return;

    const units = this.movementSystem.getUnits();
    for (const unit of units) {
      this.renderUnit(unit);
    }
  }

  private renderUnit(unit: UnitInstance): void {
    if (!this.app || !this.mapSystem || !this.unitLayer || !this.movementSystem) return;

    const grid = this.mapSystem.getGrid();
    const pos = grid.hexToPixel(unit.q, unit.r);

    const entity = new pc.Entity(`Unit_${unit.id}`);
    entity.setLocalPosition(pos.x, 5, pos.y);

    const material = new pc.StandardMaterial();
    const ownerDef = this.mapSystem.getOwnerDef(unit.owner);
    const rgb = this.hexToRgb(ownerDef.color);
    material.diffuse = new pc.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    material.emissive = new pc.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    material.emissiveIntensity = 0.5;
    material.update();

    const cylinder = new pc.Entity();
    cylinder.addComponent('render', {
      type: 'cylinder',
    });
    (cylinder.render as any).material = material;
    cylinder.setLocalScale(35, 5, 35);
    entity.addChild(cylinder);

    const textEntity = new pc.Entity();
    textEntity.addComponent('element', {
      type: 'text',
      text: `⚔️`,
      fontSize: 16,
      color: new pc.Color(1, 1, 1),
      width: 32,
      height: 32,
      useInput: false
    });
    textEntity.setLocalPosition(0, 10, 0);
    textEntity.setLocalScale(0.05, 0.05, 0.05);
    entity.addChild(textEntity);

    const moves = this.movementSystem.getUnitMoves(unit.id);
    const maxMoves = this.movementSystem.getUnitMaxMoves(unit.id);
    const movesText = new pc.Entity();
    movesText.addComponent('element', {
      type: 'text',
      text: `${moves}/${maxMoves}`,
      fontSize: 12,
      color: new pc.Color(1, 1, 0),
      width: 50,
      height: 20,
      useInput: false
    });
    movesText.setLocalPosition(0, -5, 0);
    movesText.setLocalScale(0.04, 0.04, 0.04);
    entity.addChild(movesText);

    this.unitLayer.addChild(entity);
    this.unitEntities.set(unit.id, entity);
    this.unitMovesText.set(unit.id, movesText);
  }

  selectUnit(unitId: string | null): void {
    this.selectedUnitId = unitId;
    this.clearHighlights();

    if (unitId && this.movementSystem && this.mapSystem) {
      const reachable = this.movementSystem.computeReachableTiles(unitId);
      this.reachableTiles = new Set(reachable);
      this.highlightReachableTiles();
    }
  }

  private clearHighlights(): void {
    if (!this.mapSystem) return;

    for (const key of this.reachableTiles) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(key);
      if (hexTile) {
        hexTile.setReachableHighlight(false);
      }
    }
    this.reachableTiles.clear();
  }

  private highlightReachableTiles(): void {
    if (!this.mapSystem) return;

    for (const key of this.reachableTiles) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(key);
      if (hexTile) {
        hexTile.setReachableHighlight(true);
      }
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 128, g: 128, b: 128 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  getSelectedUnitId(): string | null {
    return this.selectedUnitId;
  }

  getReachableTiles(): Set<string> {
    return this.reachableTiles;
  }

  moveSelectedUnit(q: number, r: number): boolean {
    if (!this.selectedUnitId || !this.movementSystem) return false;

    const key = `${q},${r}`;
    if (!this.reachableTiles.has(key)) return false;

    return this.movementSystem.moveTo(this.selectedUnitId, q, r);
  }
}

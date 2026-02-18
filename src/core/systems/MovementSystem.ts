import { GameSystem } from './GameSystem';
import { HexGrid, SceneData, TerrainGroups } from '../map';
import type { GameEngine } from '../engine';
import type { UnitInstance } from '../map/SceneData';

export type UnitType = 'land' | 'sea' | 'air';
export type { UnitInstance } from '../map/SceneData';

export interface MovementNode {
  q: number;
  r: number;
  cost: number;
}

export class MovementSystem extends GameSystem {
  private grid: HexGrid | null = null;
  private terrainGroups: TerrainGroups = {
    land: ['plains', 'grassland', 'forest', 'hill', 'mountain', 'desert', 'tundra'],
    sea: ['shallow_sea', 'deep_sea', 'coast'],
    air: ['plains', 'grassland', 'forest', 'hill', 'mountain', 'desert', 'tundra', 'shallow_sea', 'deep_sea', 'coast']
  };
  private units: Map<string, UnitInstance> = new Map();
  private reachableCache: Map<string, Set<string>> = new Map();

  private movementCosts: Record<string, number> = {
    plains: 2,
    grassland: 2,
    forest: 3,
    hill: 3,
    mountain: 4,
    desert: 3,
    tundra: 3,
    shallow_sea: 1,
    deep_sea: 1,
    coast: 2
  };

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.engine.getEventBus().on('map:loaded', (...args: unknown[]) => this.onMapLoaded(args[0] as SceneData));
  }

  private onMapLoaded(sceneData: SceneData): void {
    const mapSystem = this.engine.getSystems().find(s => s.constructor.name === 'MapSystem') as any;
    if (mapSystem && mapSystem.getGrid) {
      this.grid = mapSystem.getGrid();
    }
    this.loadFromSceneData(sceneData);
  }

  loadFromSceneData(data: SceneData): void {
    if (data.terrainGroups) {
      this.terrainGroups = data.terrainGroups;
    }
    this.units.clear();
    if (data.units) {
      data.units.forEach(unit => {
        this.units.set(unit.id, { ...unit });
      });
    }
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.engine.getEventBus().off('map:loaded', (...args: unknown[]) => this.onMapLoaded(args[0] as SceneData));
    this.units.clear();
    this.reachableCache.clear();
  }

  setGrid(grid: HexGrid): void {
    this.grid = grid;
  }

  getUnits(): UnitInstance[] {
    return Array.from(this.units.values());
  }

  getUnit(id: string): UnitInstance | undefined {
    return this.units.get(id);
  }

  getUnitAt(q: number, r: number): UnitInstance | undefined {
    for (const unit of this.units.values()) {
      if (unit.q === q && unit.r === r) {
        return unit;
      }
    }
    return undefined;
  }

  getUnitsByOwner(owner: string): UnitInstance[] {
    return Array.from(this.units.values()).filter(u => u.owner === owner);
  }

  addUnit(unit: UnitInstance): void {
    this.units.set(unit.id, { ...unit });
    this.invalidateCache();
    this.engine.getEventBus().emit('unit:added', unit);
  }

  removeUnit(id: string): boolean {
    const unit = this.units.get(id);
    if (unit) {
      this.units.delete(id);
      this.invalidateCache();
      this.engine.getEventBus().emit('unit:removed', unit);
      return true;
    }
    return false;
  }

  updateUnitPosition(id: string, q: number, r: number): boolean {
    const unit = this.units.get(id);
    if (!unit) return false;
    unit.q = q;
    unit.r = r;
    this.invalidateCache();
    return true;
  }

  useUnitMoves(id: string, cost: number): boolean {
    const unit = this.units.get(id);
    if (!unit || unit.moves < cost) return false;
    unit.moves -= cost;
    this.invalidateCache();
    return true;
  }

  resetAllMoves(): void {
    for (const unit of this.units.values()) {
      unit.moves = unit.maxMoves;
    }
    this.invalidateCache();
    this.engine.getEventBus().emit('units:movesReset', null);
  }

  private invalidateCache(): void {
    this.reachableCache.clear();
  }

  getUnitType(unit: UnitInstance): UnitType {
    return (unit as any).unitType as UnitType || 'land';
  }

  setUnitType(unit: UnitInstance, type: UnitType): void {
    (unit as any).unitType = type;
    this.invalidateCache();
  }

  canEnterTerrain(terrain: string, unitType: UnitType): boolean {
    const group = this.terrainGroups[unitType];
    return group ? group.includes(terrain) : false;
  }

  getTerrainMovementCost(terrain: string): number {
    return this.movementCosts[terrain] || 2;
  }

  computeReachableTiles(unitId: string): Set<string> {
    const cacheKey = unitId;
    if (this.reachableCache.has(cacheKey)) {
      return this.reachableCache.get(cacheKey)!;
    }

    const unit = this.units.get(unitId);
    if (!unit || !this.grid || unit.moves <= 0) {
      return new Set();
    }

    const unitType = this.getUnitType(unit);
    const reachable = new Set<string>();
    const dist: Map<string, number> = new Map();
    const startKey = `${unit.q},${unit.r}`;
    dist.set(startKey, 0);

    const visited = new Set<string>();
    const queue: MovementNode[] = [{ q: unit.q, r: unit.r, cost: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const currentKey = `${current.q},${current.r}`;

      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      if (current.cost > unit.moves) continue;
      if (current.cost > 0) {
        reachable.add(currentKey);
      }

      const neighbors = this.grid.getNeighbors(current.q, current.r);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        if (visited.has(neighborKey)) continue;

        const occ = this.getUnitAt(neighbor.q, neighbor.r);
        if (occ && occ.id !== unit.id) continue;

        if (!this.canEnterTerrain(neighbor.terrain, unitType)) continue;

        const moveCost = this.getTerrainMovementCost(neighbor.terrain);
        const newCost = current.cost + moveCost;

        const existingDist = dist.get(neighborKey);
        if (existingDist === undefined || newCost < existingDist) {
          dist.set(neighborKey, newCost);
          if (newCost <= unit.moves) {
            queue.push({ q: neighbor.q, r: neighbor.r, cost: newCost });
          }
        }
      }
    }

    this.reachableCache.set(cacheKey, reachable);
    return reachable;
  }

  canMoveTo(unitId: string, q: number, r: number): boolean {
    const unit = this.units.get(unitId);
    if (!unit || unit.moves <= 0) return false;

    const targetTile = this.grid?.getTile(q, r);
    if (!targetTile) return false;

    const occ = this.getUnitAt(q, r);
    if (occ && occ.id !== unit.id) return false;

    const unitType = this.getUnitType(unit);
    if (!this.canEnterTerrain(targetTile.terrain, unitType)) return false;

    const reachable = this.computeReachableTiles(unitId);
    return reachable.has(`${q},${r}`);
  }

  moveTo(unitId: string, q: number, r: number): boolean {
    const unit = this.units.get(unitId);
    if (!unit) return false;

    const targetTile = this.grid?.getTile(q, r);
    if (!targetTile) return false;

    if (!this.canMoveTo(unitId, q, r)) return false;

    const path = this.findPath(unitId, q, r);
    if (!path || path.length === 0) return false;

    let totalCost = 0;
    for (const node of path) {
      const cost = this.getTerrainMovementCost(
        this.grid?.getTile(node.q, node.r)?.terrain || 'plains'
      );
      totalCost += cost;
    }

    if (totalCost > unit.moves) return false;

    const oldQ = unit.q;
    const oldR = unit.r;
    unit.q = q;
    unit.r = r;
    unit.moves -= totalCost;

    this.invalidateCache();
    this.engine.getEventBus().emit('unit:moved', { unit, from: { q: oldQ, r: oldR }, to: { q, r }, cost: totalCost });
    return true;
  }

  private findPath(unitId: string, targetQ: number, targetR: number): MovementNode[] | null {
    const unit = this.units.get(unitId);
    if (!unit || !this.grid) return null;

    const unitType = this.getUnitType(unit);
    const targetKey = `${targetQ},${targetR}`;
    const startKey = `${unit.q},${unit.r}`;

    if (startKey === targetKey) return [];

    const dist: Map<string, number> = new Map();
    const prev: Map<string, { q: number; r: number }> = new Map();
    const visited = new Set<string>();

    dist.set(startKey, 0);
    const queue: MovementNode[] = [{ q: unit.q, r: unit.r, cost: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const currentKey = `${current.q},${current.r}`;

      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      if (current.cost > unit.moves) continue;
      if (currentKey === targetKey) break;

      const neighbors = this.grid.getNeighbors(current.q, current.r);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        if (visited.has(neighborKey)) continue;

        const occ = this.getUnitAt(neighbor.q, neighbor.r);
        if (occ && occ.id !== unit.id) continue;

        if (!this.canEnterTerrain(neighbor.terrain, unitType)) continue;

        const moveCost = this.getTerrainMovementCost(neighbor.terrain);
        const newCost = current.cost + moveCost;

        if (newCost > unit.moves) continue;

        const existingDist = dist.get(neighborKey);
        if (existingDist === undefined || newCost < existingDist) {
          dist.set(neighborKey, newCost);
          prev.set(neighborKey, { q: current.q, r: current.r });
          queue.push({ q: neighbor.q, r: neighbor.r, cost: newCost });
        }
      }
    }

    if (!dist.has(targetKey)) return null;

    const path: MovementNode[] = [];
    let current: { q: number; r: number } | undefined = { q: targetQ, r: targetR };

    while (current) {
      const key = `${current.q},${current.r}`;
      const cost = dist.get(key) || 0;
      path.unshift({ q: current.q, r: current.r, cost });

      if (key === startKey) break;
      current = prev.get(key);
    }

    return path;
  }

  getSceneDataUnits(): UnitInstance[] {
    return Array.from(this.units.values());
  }
}

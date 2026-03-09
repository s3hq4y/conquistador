import { GameSystem } from '@core/systems/GameSystem';
import { HexGrid, Tile } from '@core/map';
import type { GameEngine } from '@core/engine';
import type { UnitInstance, SceneData } from '@core/map/SceneData';
import { TraitManager } from '@core/traits';
import { debug } from '@core/utils/debug';
import { PathfindingSystem, TerrainManager, UnitStateManager, UnitManager, type UnitType } from './movement';

export type { UnitType, MovementNode } from './movement';
export type { UnitInstance } from '@core/map/SceneData';

export class MovementSystem extends GameSystem {
  private grid: HexGrid | null = null;
  private mapSystem: MapSystem | null = null;
  
  private unitManager: UnitManager;
  private unitStateManager: UnitStateManager;
  private pathfindingSystem: PathfindingSystem;
  private terrainManager: TerrainManager;
  
  private reachableCache: Map<string, Set<string>> = new Map();
  private traitManager: TraitManager | null = null;

  constructor(engine: GameEngine) {
    super(engine);
    
    this.unitManager = new UnitManager();
    this.unitStateManager = new UnitStateManager();
    this.pathfindingSystem = new PathfindingSystem();
    this.terrainManager = new TerrainManager();
  }

  initialize(): void {
    this.engine.getEventBus().on('map:loaded', (...args: unknown[]) => this.onMapLoaded(args[0] as SceneData));
  }

  setTraitManager(manager: TraitManager): void {
    this.traitManager = manager;
  }

  getTraitManager(): TraitManager | null {
    return this.traitManager;
  }

  private onMapLoaded(sceneData: SceneData): void {
    const found = this.engine.getSystems().find(s => s.constructor.name === 'MapSystem');
    this.mapSystem = found as unknown as MapSystem | null;
    if (this.mapSystem && this.mapSystem.getGrid) {
      const grid = this.mapSystem.getGrid();
      if (grid) {
        this.grid = grid;
        this.pathfindingSystem.setGrid(grid);
      }
    }
    this.loadFromSceneData(sceneData);
  }

  loadFromSceneData(data: SceneData): void {
    if (data.terrainGroups) {
      this.terrainManager.setTerrainGroups(data.terrainGroups);
    }
    
    if (this.grid) {
      for (const tile of this.grid.getTiles()) {
        tile.unitOrder = [];
        tile.building = null;
      }
    }
    
    this.unitManager.clear();
    this.unitStateManager.clear();
    
    if (data.units) {
      data.units.forEach(unit => {
        const category = this.getUnitCategory(unit);
        const capacityType = this.getCapacityTypeForCategory(category);
        const tile = this.getTileAt(unit.q, unit.r);
        
        if (!tile) return;
        if (capacityType === 'army' && !tile.canAddArmy()) return;
        if (capacityType === 'building' && !tile.canAddBuilding()) return;
        
        this.unitManager.add(unit);
        const maxMoves = this.calculateMovement(unit.traits);
        this.unitStateManager.createState(unit, maxMoves);
        
        tile.addUnit(unit.id, capacityType);
        debug.movement(`[MovementSystem] Loaded unit: ${unit.id} at (${unit.q},${unit.r}) with maxMoves=${maxMoves}`);
      });
    }
  }

  private calculateMovement(traits: string[]): number {
    if (this.traitManager) {
      const stats = this.traitManager.calculateStats(traits);
      return stats.movement ?? 6;
    }
    return 6;
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.engine.getEventBus().off('map:loaded', (...args: unknown[]) => this.onMapLoaded(args[0] as SceneData));
    this.unitManager.clear();
    this.unitStateManager.clear();
    this.reachableCache.clear();
  }

  setGrid(grid: HexGrid): void {
    this.grid = grid;
    this.pathfindingSystem.setGrid(grid);
  }

  getUnits(): UnitInstance[] {
    return this.unitManager.getAll();
  }

  getUnit(id: string): UnitInstance | undefined {
    return this.unitManager.get(id);
  }

  getUnitAt(q: number, r: number): UnitInstance | undefined {
    return this.unitManager.getAt(q, r);
  }

  getUnitsAt(q: number, r: number): UnitInstance[] {
    return this.unitManager.getAllAt(q, r);
  }

  getTopUnitAt(q: number, r: number): UnitInstance | undefined {
    const tile = this.getTileAt(q, r);
    return this.unitManager.getTopAt(tile);
  }

  getTileAt(q: number, r: number): Tile | undefined {
    if (!this.mapSystem || !this.mapSystem.getGrid) return undefined;
    const grid = this.mapSystem.getGrid();
    if (!grid) return undefined;
    return grid.getTile(q, r);
  }

  getUnitCategory(unit: UnitInstance): string {
    if (!this.traitManager || !unit.traits || unit.traits.length === 0) {
      return 'army';
    }
    return this.traitManager.getUnitCategory(unit.traits);
  }

  getCapacityTypeForCategory(category: string): 'army' | 'building' {
    if (category === 'building') {
      return 'building';
    }
    return 'army';
  }

  canPlaceUnit(q: number, r: number, category?: 'army' | 'building'): boolean {
    const tile = this.getTileAt(q, r);
    if (!tile) return false;
    const unitCategory = category || 'army';
    if (unitCategory === 'army') {
      return tile.canAddArmy();
    } else {
      return tile.canAddBuilding();
    }
  }

  addUnitToTile(unit: UnitInstance): boolean {
    const category = this.getUnitCategory(unit);
    const capacityType = this.getCapacityTypeForCategory(category);
    if (!this.canPlaceUnit(unit.q, unit.r, capacityType)) {
      return false;
    }
    this.addUnit(unit);
    const tile = this.getTileAt(unit.q, unit.r);
    if (tile) {
      tile.addUnit(unit.id, capacityType);
    }
    return true;
  }

  removeUnitFromTile(id: string): boolean {
    const unit = this.unitManager.get(id);
    if (!unit) return false;
    const category = this.getUnitCategory(unit);
    const capacityType = this.getCapacityTypeForCategory(category);
    const tile = this.getTileAt(unit.q, unit.r);
    if (tile) {
      tile.removeUnit(id, capacityType);
    }
    return this.removeUnit(id);
  }

  reorderUnitsOnTile(q: number, r: number, newOrder: string[]): boolean {
    const tile = this.getTileAt(q, r);
    if (!tile) return false;
    const currentUnits = this.unitManager.getAllAt(q, r);
    const currentIds = currentUnits.map(u => u.id);
    for (const unitId of newOrder) {
      if (!currentIds.includes(unitId)) return false;
    }
    tile.setUnitOrder(newOrder);
    return true;
  }

  getTileCapacity(q: number, r: number): { army: number; building: number; armyCount: number; buildingCount: number } | null {
    const tile = this.getTileAt(q, r);
    if (!tile) return null;
    return {
      army: tile.getArmyCapacity(),
      building: tile.getBuildingCapacity(),
      armyCount: tile.getArmyCount(),
      buildingCount: tile.getBuildingCount()
    };
  }

  getUnitsByOwner(owner: string): UnitInstance[] {
    return this.unitManager.getByOwner(owner);
  }

  addUnit(unit: UnitInstance): void {
    this.unitManager.add(unit);
    const maxMoves = this.calculateMovement(unit.traits);
    this.unitStateManager.createState(unit, maxMoves);
    this.invalidateCache();
    this.engine.getEventBus().emit('unit:added', unit);
    debug.movement(`[MovementSystem] Unit added: ${unit.id} at (${unit.q},${unit.r}), maxMoves=${maxMoves}`);
  }

  removeUnit(id: string): boolean {
    const unit = this.unitManager.get(id);
    if (unit) {
      this.unitManager.remove(id);
      this.unitStateManager.remove(id);
      this.invalidateCache();
      this.engine.getEventBus().emit('unit:removed', unit);
      debug.movement(`[MovementSystem] Unit removed: ${id}`);
      return true;
    }
    return false;
  }

  updateUnitPosition(id: string, q: number, r: number): boolean {
    const result = this.unitManager.updatePosition(id, q, r);
    if (result) {
      this.invalidateCache();
    }
    return result;
  }

  useUnitMoves(id: string, cost: number): boolean {
    const state = this.unitStateManager.getState(id);
    if (!state || state.moves < cost) {
      debug.movement(`[MovementSystem] Cannot use ${cost} moves for unit ${id}, has ${state?.moves ?? 0}`);
      return false;
    }
    this.unitStateManager.useMoves(id, cost);
    this.invalidateCache();
    debug.movement(`[MovementSystem] Unit ${id} used ${cost} moves, remaining ${state.moves}`);
    return true;
  }

  resetAllMoves(): void {
    this.unitStateManager.resetAll();
    this.invalidateCache();
    this.engine.getEventBus().emit('units:movesReset', null);
    debug.movement(`[MovementSystem] All units moves reset`);
  }

  setAttacked(id: string): void {
    this.unitStateManager.setAttacked(id);
  }

  canAttack(id: string): boolean {
    return this.unitStateManager.canAttack(id);
  }

  clearMovement(id: string): void {
    this.unitStateManager.clearMovement(id);
    this.invalidateCache();
  }

  private invalidateCache(): void {
    this.reachableCache.clear();
  }

  getUnitType(unit: UnitInstance): UnitType {
    if (this.traitManager) {
      const allTraits = this.traitManager.getUnitAllTraitIds(unit.traits);
      if (allTraits.includes('cavalry')) return 'land';
      if (allTraits.includes('archer')) return 'land';
      if (allTraits.includes('infantry')) return 'land';
    }
    return 'land';
  }

  canEnterTerrain(terrain: string, unitType: UnitType): boolean {
    return this.terrainManager.canEnterTerrain(terrain, unitType);
  }

  getTerrainMovementCost(terrain: string): number {
    return this.terrainManager.getTerrainMovementCost(terrain);
  }

  computeReachableTiles(unitId: string): Set<string> {
    const cacheKey = unitId;
    if (this.reachableCache.has(cacheKey)) {
      return this.reachableCache.get(cacheKey)!;
    }

    const unit = this.unitManager.get(unitId);
    const state = this.unitStateManager.getState(unitId);
    if (!unit || !this.grid || !state || state.moves <= 0) {
      return new Set();
    }

    const unitType = this.getUnitType(unit);
    const maxMoves = state.moves;

    const reachable = this.pathfindingSystem.computeReachableTiles(
      unit,
      unitType,
      maxMoves,
      (terrain) => this.terrainManager.getTerrainMovementCost(terrain),
      (terrain, ut) => this.terrainManager.canEnterTerrain(terrain, ut),
      (q, r) => this.unitManager.getAt(q, r)
    );

    this.reachableCache.set(cacheKey, reachable);
    return reachable;
  }

  canMoveTo(unitId: string, q: number, r: number): boolean {
    const unit = this.unitManager.get(unitId);
    const state = this.unitStateManager.getState(unitId);
    if (!unit || !state || state.moves <= 0) {
      debug.movement(`[MovementSystem] canMoveTo: unit=${unitId} not found or no moves left`);
      return false;
    }

    const targetTile = this.grid?.getTile(q, r);
    if (!targetTile) {
      debug.movement(`[MovementSystem] canMoveTo: target tile (${q},${r}) not found`);
      return false;
    }

    const occ = this.unitManager.getAt(q, r);
    if (occ && occ.id !== unit.id) {
      debug.movement(`[MovementSystem] canMoveTo: tile (${q},${r}) occupied by ${occ.id}`);
      return false;
    }

    const unitType = this.getUnitType(unit);
    if (!this.terrainManager.canEnterTerrain(targetTile.terrain, unitType)) {
      debug.movement(`[MovementSystem] canMoveTo: terrain ${targetTile.terrain} not accessible for unit type ${unitType}`);
      return false;
    }

    const reachable = this.computeReachableTiles(unitId);
    const canReach = reachable.has(`${q},${r}`);
    debug.movement(`[MovementSystem] canMoveTo: unit=${unitId} to (${q},${r}) = ${canReach}, reachable tiles: ${reachable.size}`);
    return canReach;
  }

  moveTo(unitId: string, q: number, r: number): boolean {
    const unit = this.unitManager.get(unitId);
    const state = this.unitStateManager.getState(unitId);
    if (!unit) return false;

    const targetTile = this.grid?.getTile(q, r);
    if (!targetTile) return false;

    if (!this.canMoveTo(unitId, q, r)) return false;

    const unitType = this.getUnitType(unit);
    const path = this.pathfindingSystem.findPath(
      unit,
      unitType,
      state!.moves,
      (terrain) => this.terrainManager.getTerrainMovementCost(terrain),
      (terrain, ut) => this.terrainManager.canEnterTerrain(terrain, ut),
      (q, r) => this.unitManager.getAt(q, r),
      q, r
    );
    
    if (!path || path.length === 0) return false;

    const totalCost = path[path.length - 1].cost;

    if (totalCost > state!.moves) return false;

    const oldQ = unit.q;
    const oldR = unit.r;
    this.unitManager.updatePosition(unitId, q, r);
    this.unitStateManager.useMoves(unitId, totalCost);

    this.invalidateCache();
    this.engine.getEventBus().emit('unit:moved', { unit, from: { q: oldQ, r: oldR }, to: { q, r }, cost: totalCost });
    debug.movement(`[MovementSystem] Unit ${unitId} moved from (${oldQ},${oldR}) to (${q},${r}), cost=${totalCost}, remaining moves=${state!.moves}`);
    return true;
  }

  getSceneDataUnits(): UnitInstance[] {
    return this.unitManager.getAll();
  }

  getUnitMoves(id: string): number {
    return this.unitStateManager.getMoves(id);
  }

  getUnitMaxMoves(id: string): number {
    return this.unitStateManager.getMaxMoves(id);
  }

  getBuildingAt(q: number, r: number): string | null {
    const tile = this.getTileAt(q, r);
    return tile?.building || null;
  }

  getBuildingsByOwner(ownerId: string): UnitInstance[] {
    return this.unitManager.getByOwner(ownerId).filter(unit => {
      const category = this.getUnitCategory(unit);
      return category === 'building' && unit.owner === ownerId;
    });
  }

  getAdjacentBuildings(q: number, r: number, ownerId?: string): UnitInstance[] {
    if (!this.mapSystem || !this.mapSystem.getGrid) return [];
    
    const grid = this.mapSystem.getGrid();
    if (!grid) return [];
    const neighbors = grid.getNeighbors(q, r);
    const buildings: UnitInstance[] = [];

    for (const n of neighbors) {
      const buildingId = this.getBuildingAt(n.q, n.r);
      if (buildingId) {
        const unit = this.unitManager.get(buildingId);
        if (unit && (!ownerId || unit.owner === ownerId)) {
          buildings.push(unit);
        }
      }
    }

    return buildings;
  }

  getNeighbors(q: number, r: number): Array<{ q: number; r: number }> {
    if (!this.mapSystem || !this.mapSystem.getGrid) return [];
    const grid = this.mapSystem.getGrid();
    if (!grid) return [];
    return grid.getNeighbors(q, r);
  }
}

interface MapSystem {
  getGrid(): HexGrid | null;
}

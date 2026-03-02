import { GameEngine } from '../engine';
import { GameSystem } from './GameSystem';
import { MovementSystem } from './MovementSystem';
import { TraitManager } from '../traits/TraitManager';
import { Trait, BuildCondition } from '../traits/types';
import { Tile } from '../map/Tile';
import { debug } from '../utils/debug';
import type { UnitInstance } from '../map/SceneData';
import { useGameStore } from '@/stores/game';
import { useGameEventStore } from '@/stores/gameEvent';
import { unitTypeManager } from '../unit';

export interface BuildResult {
  success: boolean;
  error?: string;
  unitId?: string;
}

export interface BuildableItem {
  traitId: string;
  name: string;
  icon: string;
  description?: string;
  cost: Record<string, number>;
  canBuild: boolean;
  reason?: string;
}

function getTraitName(trait: Trait): string {
  if (typeof trait.name === 'object' && trait.name !== null) {
    return (trait.name as any).zh || (trait.name as any).en || trait.id;
  }
  return trait.name || trait.id;
}

function getTraitDescription(trait: Trait): string | undefined {
  if (typeof trait.description === 'object' && trait.description !== null) {
    return (trait.description as any).zh || (trait.description as any).en;
  }
  return trait.description;
}

function getTraitIcon(trait: Trait): string {
  return (trait as any).icon || '🏰';
}

export class BuildingSystem extends GameSystem {
  name = 'BuildingSystem';

  private movementSystem: MovementSystem | null = null;
  private traitManager: TraitManager | null = null;
  private gameStore: ReturnType<typeof useGameStore> | null = null;
  private gameEventStore: ReturnType<typeof useGameEventStore> | null = null;

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    const systems = this.engine.getSystems();
    this.movementSystem = systems.find(s => s instanceof MovementSystem) as MovementSystem || null;
    this.gameStore = useGameStore();
    this.gameEventStore = useGameEventStore();

    debug.building('[BuildingSystem] Initialized');
  }

  setTraitManager(traitManager: TraitManager): void {
    this.traitManager = traitManager;
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.movementSystem = null;
    this.traitManager = null;
    this.gameStore = null;
  }

  private ensureInitialized(): void {
    if (!this.movementSystem || !this.traitManager || !this.gameStore) {
      throw new Error('BuildingSystem not initialized');
    }
  }

  canBuild(traitId: string, q: number, r: number, ownerId: string): { valid: boolean; reason?: string } {
    this.ensureInitialized();

    const trait = this.traitManager!.getTrait(traitId);
    if (!trait) {
      return { valid: false, reason: 'Unknown trait' };
    }

    if (trait.type !== 'buildingType') {
      return { valid: false, reason: 'Not a building type' };
    }

    if (trait.cost && !this.gameStore!.canAfford(trait.cost, ownerId)) {
      return { valid: false, reason: 'Insufficient resources' };
    }

    const tile = this.movementSystem!.getTileAt(q, r);
    if (!tile) {
      return { valid: false, reason: 'Invalid tile' };
    }

    if (tile.owner !== ownerId) {
      return { valid: false, reason: 'Not your tile' };
    }

    if (!tile.canAddBuilding()) {
      return { valid: false, reason: 'Building capacity full' };
    }

    if (tile.building) {
      return { valid: false, reason: 'Already has building' };
    }

    if (trait.buildConditions) {
      for (const condition of trait.buildConditions) {
        const result = this.checkBuildCondition(condition, tile, q, r, ownerId);
        if (!result.valid) {
          return result;
        }
      }
    }

    return { valid: true };
  }

  private checkBuildCondition(
    condition: BuildCondition,
    tile: Tile,
    q: number,
    r: number,
    ownerId: string
  ): { valid: boolean; reason?: string } {
    switch (condition.type) {
      case 'terrain':
        if (!condition.values?.includes(tile.terrain)) {
          return { valid: false, reason: `Cannot build on ${tile.terrain}` };
        }
        return { valid: true };

      case 'owner':
        if (tile.owner !== ownerId) {
          return { valid: false, reason: 'Not your tile' };
        }
        return { valid: true };

      case 'adjacentCity':
        if (condition.value) {
          const hasCity = this.hasAdjacentBuilding(q, r, ownerId, 'city');
          if (!hasCity) {
            return { valid: false, reason: 'Must be adjacent to a city' };
          }
        }
        return { valid: true };

      case 'adjacentBuilding':
        if (condition.value) {
          const hasBuilding = this.hasAdjacentBuilding(q, r, ownerId);
          if (!hasBuilding) {
            return { valid: false, reason: 'Must be adjacent to a building' };
          }
        }
        return { valid: true };

      default:
        return { valid: true };
    }
  }

  private hasAdjacentBuilding(q: number, r: number, _ownerId: string, buildingType?: string): boolean {
    if (!this.movementSystem) return false;

    const neighbors = this.movementSystem.getNeighbors(q, r);

    for (const neighbor of neighbors) {
      const buildingId = this.movementSystem.getBuildingAt(neighbor.q, neighbor.r);
      if (buildingId) {
        if (!buildingType) return true;

        const unit = this.movementSystem.getUnit(buildingId);
        if (unit && unit.traits.includes(buildingType)) {
          return true;
        }
      }
    }

    return false;
  }

  build(traitId: string, q: number, r: number, ownerId: string): BuildResult {
    this.ensureInitialized();

    const validation = this.canBuild(traitId, q, r, ownerId);
    if (!validation.valid) {
      debug.scene(`[BuildingSystem] Cannot build: ${validation.reason}`);
      return { success: false, error: validation.reason };
    }

    const trait = this.traitManager!.getTrait(traitId);
    if (!trait) {
      return { success: false, error: 'Trait not found' };
    }

    if (trait.cost && !this.gameStore!.deductResources(trait.cost, ownerId)) {
      return { success: false, error: 'Failed to deduct resources' };
    }

    const unitId = `${traitId}_${Date.now()}`;
    const hp = trait.stats?.hp || 100;

    const unit: UnitInstance = {
      id: unitId,
      q,
      r,
      owner: ownerId,
      traits: [traitId],
      hp
    };

    const added = this.movementSystem!.addUnitToTile(unit);
    if (!added) {
      if (trait.cost) {
        this.gameStore!.addResources(trait.cost, ownerId);
      }
      return { success: false, error: 'Failed to add unit' };
    }

    debug.scene(`[BuildingSystem] Built ${traitId} at (${q}, ${r})`);

    return { success: true, unitId };
  }

  getBuildableItems(q: number, r: number, ownerId: string): BuildableItem[] {
    this.ensureInitialized();

    const tile = this.movementSystem!.getTileAt(q, r);
    if (!tile || tile.owner !== ownerId) {
      return [];
    }

    const allTraits = this.traitManager!.getAllTraits();
    const buildingTraits: Trait[] = [];

    allTraits.forEach((trait) => {
      if (trait.type === 'buildingType') {
        buildingTraits.push(trait);
      }
    });

    return buildingTraits.map(trait => {
      const validation = this.canBuild(trait.id, q, r, ownerId);
      return {
        traitId: trait.id,
        name: getTraitName(trait),
        icon: getTraitIcon(trait),
        description: getTraitDescription(trait),
        cost: trait.cost || {},
        canBuild: validation.valid,
        reason: validation.reason
      };
    });
  }

  canRecruit(unitTraitId: string, barracksQ: number, barracksR: number, ownerId: string): { valid: boolean; reason?: string } {
    this.ensureInitialized();

    const buildingId = this.movementSystem!.getBuildingAt(barracksQ, barracksR);
    if (!buildingId) {
      return { valid: false, reason: 'No building here' };
    }

    const building = this.movementSystem!.getUnit(buildingId);
    if (!building || building.owner !== ownerId) {
      return { valid: false, reason: 'Not your building' };
    }

    const barracksTrait = this.traitManager!.getTrait(building.traits[0]);
    if (!barracksTrait?.recruitTypes?.includes(unitTraitId)) {
      return { valid: false, reason: 'Cannot recruit this unit type' };
    }

    const targetTile = this.movementSystem!.getTileAt(barracksQ, barracksR);
    if (!targetTile?.canAddArmy()) {
      return { valid: false, reason: 'No army capacity' };
    }

    const unitTrait = this.traitManager!.getTrait(unitTraitId);
    if (unitTrait?.cost && !this.gameStore!.canAfford(unitTrait.cost, ownerId)) {
      return { valid: false, reason: 'Insufficient resources' };
    }

    return { valid: true };
  }

  recruit(unitTraitId: string, barracksQ: number, barracksR: number, ownerId: string): BuildResult {
    this.ensureInitialized();

    const validation = this.canRecruit(unitTraitId, barracksQ, barracksR, ownerId);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const unitTrait = this.traitManager!.getTrait(unitTraitId);
    if (!unitTrait) {
      return { success: false, error: 'Unit trait not found' };
    }

    if (unitTrait.cost && !this.gameStore!.deductResources(unitTrait.cost, ownerId)) {
      return { success: false, error: 'Failed to deduct resources' };
    }

    const unitId = `${unitTraitId}_${Date.now()}`;
    const hp = unitTrait.stats?.hp || 100;

    const unit: UnitInstance = {
      id: unitId,
      q: barracksQ,
      r: barracksR,
      owner: ownerId,
      traits: [unitTraitId],
      hp
    };

    const added = this.movementSystem!.addUnitToTile(unit);
    if (!added) {
      if (unitTrait.cost) {
        this.gameStore!.addResources(unitTrait.cost, ownerId);
      }
      return { success: false, error: 'Failed to add unit' };
    }

    debug.scene(`[BuildingSystem] Recruited ${unitTraitId} at (${barracksQ}, ${barracksR})`);

    return { success: true, unitId };
  }

  getRecruitableItems(q: number, r: number, ownerId: string): BuildableItem[] {
    this.ensureInitialized();

    const buildingId = this.movementSystem!.getBuildingAt(q, r);
    if (!buildingId) {
      return [];
    }

    const building = this.movementSystem!.getUnit(buildingId);
    if (!building || building.owner !== ownerId) {
      return [];
    }

    const buildingTraitId = building.traits[0];
    const buildingType = this.traitManager!.getTrait(buildingTraitId)?.id;
    if (!buildingType) {
      return [];
    }

    const tile = this.movementSystem!.getTileAt(q, r);
    const canRecruit = tile?.canAddArmy() ?? false;

    const currentTurn = this.gameEventStore!.currentTurn;
    const recruitableUnits = unitTypeManager.getRecruitableUnits(buildingType, currentTurn);

    return recruitableUnits.map(unitType => {
      const cost = unitTypeManager.calculateCost(unitType.id, buildingType);
      const costRecord = cost as Record<string, number>;
      const validation = this.canRecruitByUnitType(unitType.id, q, r, ownerId);

      return {
        traitId: unitType.id,
        name: unitType.name.zh || unitType.id,
        icon: unitType.icon,
        description: unitType.description?.zh,
        cost: costRecord,
        canBuild: canRecruit && validation.valid,
        reason: !canRecruit ? 'No army capacity' : validation.reason
      };
    });
  }

  private canRecruitByUnitType(unitTypeId: string, q: number, r: number, ownerId: string): { valid: boolean; reason?: string } {
    const buildingId = this.movementSystem!.getBuildingAt(q, r);
    if (!buildingId) {
      return { valid: false, reason: 'No building here' };
    }

    const building = this.movementSystem!.getUnit(buildingId);
    if (!building || building.owner !== ownerId) {
      return { valid: false, reason: 'Not your building' };
    }

    const buildingTraitId = building.traits[0];
    const buildingType = this.traitManager!.getTrait(buildingTraitId)?.id;
    if (!buildingType) {
      return { valid: false, reason: 'Invalid building type' };
    }

    const slotInfo = unitTypeManager.getRecruitSlot(buildingType, unitTypeId);
    if (!slotInfo) {
      return { valid: false, reason: 'Cannot recruit this unit type' };
    }

    const targetTile = this.movementSystem!.getTileAt(q, r);
    if (!targetTile?.canAddArmy()) {
      return { valid: false, reason: 'No army capacity' };
    }

    const cost = unitTypeManager.calculateCost(unitTypeId, buildingType);
    const costRecord = cost as Record<string, number>;
    if (!this.gameStore!.canAfford(costRecord, ownerId)) {
      return { valid: false, reason: 'Insufficient resources' };
    }

    return { valid: true };
  }

  recruitByUnitType(unitTypeId: string, q: number, r: number, ownerId: string): BuildResult {
    this.ensureInitialized();

    const validation = this.canRecruitByUnitType(unitTypeId, q, r, ownerId);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const buildingId = this.movementSystem!.getBuildingAt(q, r);
    if (!buildingId) {
      return { success: false, error: 'No building here' };
    }

    const building = this.movementSystem!.getUnit(buildingId);
    if (!building) {
      return { success: false, error: 'Building not found' };
    }

    const buildingTraitId = building.traits[0];
    const buildingType = this.traitManager!.getTrait(buildingTraitId)?.id;
    if (!buildingType) {
      return { success: false, error: 'Invalid building type' };
    }

    const unitType = unitTypeManager.getUnitType(unitTypeId);
    if (!unitType) {
      return { success: false, error: 'Unit type not found' };
    }

    const cost = unitTypeManager.calculateCost(unitTypeId, buildingType);
    const costRecord = cost as Record<string, number>;
    if (!this.gameStore!.deductResources(costRecord, ownerId)) {
      return { success: false, error: 'Failed to deduct resources' };
    }

    const finalStats = unitTypeManager.calculateFinalStats(unitTypeId);
    const unitId = `${unitTypeId}_${Date.now()}`;

    const unit: UnitInstance = {
      id: unitId,
      q,
      r,
      owner: ownerId,
      traits: unitType.traits,
      hp: finalStats.hp || 100
    };

    const added = this.movementSystem!.addUnitToTile(unit);
    if (!added) {
      this.gameStore!.addResources(costRecord, ownerId);
      return { success: false, error: 'Failed to add unit' };
    }

    debug.scene(`[BuildingSystem] Recruited ${unitTypeId} at (${q}, ${r})`);

    return { success: true, unitId };
  }
}

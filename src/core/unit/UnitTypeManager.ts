import {
  RecruitUnitType,
  RecruitBuildingConfig,
  RecruitUnitsData,
  RecruitBuildingsData,
  UnitManifest,
  UnitCost,
} from './types';
import type { UnitStats as TraitStats } from '../traits/types';
import { TraitManager } from '../traits/TraitManager';
import { debug } from '../utils/debug';

export class UnitTypeManager {
  private unitTypes: Map<string, RecruitUnitType> = new Map();
  private recruitBuildings: Map<string, RecruitBuildingConfig> = new Map();
  private traitManager: TraitManager | null = null;

  setTraitManager(traitManager: TraitManager): void {
    this.traitManager = traitManager;
  }

  async loadFromPath(path: string): Promise<void> {
    try {
      const manifestUrl = `${path}/manifest.json`;
      const manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok) {
        throw new Error(`Failed to load manifest: ${manifestResponse.statusText}`);
      }
      const manifest = await manifestResponse.json() as UnitManifest;

      if (!manifest.files) {
        throw new Error('Invalid manifest: missing files');
      }

      const unitsUrl = `${path}/${manifest.files.recruit_units}`;
      const unitsResponse = await fetch(unitsUrl);
      if (!unitsResponse.ok) {
        throw new Error(`Failed to load recruit units: ${unitsResponse.statusText}`);
      }
      const unitsData: RecruitUnitsData = await unitsResponse.json();
      this.loadUnitsData(unitsData);

      const buildingsUrl = `${path}/${manifest.files.buildings}`;
      const buildingsResponse = await fetch(buildingsUrl);
      if (!buildingsResponse.ok) {
        throw new Error(`Failed to load buildings: ${buildingsResponse.statusText}`);
      }
      const buildingsData: RecruitBuildingsData = await buildingsResponse.json();
      this.loadBuildingsData(buildingsData);

      debug.building(`[UnitTypeManager] Loaded ${this.unitTypes.size} unit types, ${this.recruitBuildings.size} recruit buildings`);
    } catch (error) {
      debug.building(`[UnitTypeManager] Error loading from path ${path}:`, error);
      throw error;
    }
  }

  loadUnitsData(data: RecruitUnitsData): void {
    this.unitTypes.clear();
    for (const [id, unitType] of Object.entries(data.units)) {
      this.unitTypes.set(id, unitType);
    }
    debug.building(`[UnitTypeManager] Loaded ${this.unitTypes.size} unit types`);
  }

  loadBuildingsData(data: RecruitBuildingsData): void {
    this.recruitBuildings.clear();
    for (const [id, building] of Object.entries(data.recruitBuildings)) {
      this.recruitBuildings.set(id, building);
    }
    debug.building(`[UnitTypeManager] Loaded ${this.recruitBuildings.size} recruit buildings`);
  }

  getUnitType(id: string): RecruitUnitType | undefined {
    return this.unitTypes.get(id);
  }

  getAllUnitTypes(): Map<string, RecruitUnitType> {
    return this.unitTypes;
  }

  getVisibleUnitTypes(): RecruitUnitType[] {
    return Array.from(this.unitTypes.values()).filter(unit => unit.visible);
  }

  getBuildingConfig(buildingType: string): RecruitBuildingConfig | undefined {
    return this.recruitBuildings.get(buildingType);
  }

  getAllRecruitBuildings(): Map<string, RecruitBuildingConfig> {
    return this.recruitBuildings;
  }

  getRecruitableUnits(buildingType: string, currentTurn: number): RecruitUnitType[] {
    const building = this.recruitBuildings.get(buildingType);
    if (!building) {
      return [];
    }

    const result: RecruitUnitType[] = [];
    for (const slot of building.recruitSlots) {
      if (slot.unlockTurn <= currentTurn) {
        const unitType = this.unitTypes.get(slot.unitType);
        if (unitType && unitType.visible) {
          result.push(unitType);
        }
      }
    }
    return result;
  }

  getRecruitSlot(buildingType: string, unitType: string): { slot: { unlockTurn: number; costMultiplier: number }; building: RecruitBuildingConfig } | null {
    const building = this.recruitBuildings.get(buildingType);
    if (!building) {
      return null;
    }

    for (const slot of building.recruitSlots) {
      if (slot.unitType === unitType) {
        return { slot, building };
      }
    }
    return null;
  }

  calculateFinalStats(unitTypeId: string): TraitStats {
    const unitType = this.unitTypes.get(unitTypeId);
    if (!unitType) {
      return { hp: 0, attack: 0, defense: 0, movement: 0, range: 0 };
    }

    let finalStats = { ...unitType.baseStats };

    if (this.traitManager && unitType.traits.length > 0) {
      const traitStats = this.traitManager.calculateStats(unitType.traits);
      finalStats = {
        hp: (finalStats.hp ?? 0) + (traitStats.hp ?? 0),
        attack: (finalStats.attack ?? 0) + (traitStats.attack ?? 0),
        defense: (finalStats.defense ?? 0) + (traitStats.defense ?? 0),
        movement: (finalStats.movement ?? 0) + (traitStats.movement ?? 0),
        range: (finalStats.range ?? 0) + (traitStats.range ?? 0),
      };
    }

    return finalStats;
  }

  calculateCost(unitTypeId: string, buildingType: string): UnitCost {
    const unitType = this.unitTypes.get(unitTypeId);
    if (!unitType) {
      return {};
    }

    const slotInfo = this.getRecruitSlot(buildingType, unitTypeId);
    const multiplier = slotInfo?.slot.costMultiplier || 1.0;

    const cost: UnitCost = {};
    for (const [resource, amount] of Object.entries(unitType.cost)) {
      cost[resource] = Math.floor((amount || 0) * multiplier);
    }

    return cost;
  }

  getUnitCategory(unitTypeId: string): string {
    const unitType = this.unitTypes.get(unitTypeId);
    return unitType?.category || 'infantry';
  }

  getUnitsByCategory(category: string): RecruitUnitType[] {
    return Array.from(this.unitTypes.values()).filter(
      unit => unit.category === category && unit.visible
    );
  }

  getUnitsByTier(tier: number): RecruitUnitType[] {
    return Array.from(this.unitTypes.values()).filter(
      unit => unit.tier === tier && unit.visible
    );
  }
}

export const unitTypeManager = new UnitTypeManager();

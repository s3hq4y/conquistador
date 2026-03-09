/**
 * TerrainManager - 地形管理模块
 * 
 * 管理地形组分类和移动成本
 */

import { TerrainGroups } from '../../map';
import type { UnitInstance } from '../../map/SceneData';

export type UnitType = 'land' | 'sea' | 'air';

export class TerrainManager {
  private terrainGroups: TerrainGroups = {
    land: ['plains', 'grassland', 'forest', 'hill', 'mountain', 'desert', 'tundra'],
    sea: ['shallow_sea', 'deep_sea', 'coast'],
    air: ['plains', 'grassland', 'forest', 'hill', 'mountain', 'desert', 'tundra', 'shallow_sea', 'deep_sea', 'coast']
  };

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

  setTerrainGroups(groups: TerrainGroups): void {
    this.terrainGroups = groups;
  }

  getTerrainGroups(): TerrainGroups {
    return this.terrainGroups;
  }

  setMovementCosts(costs: Record<string, number>): void {
    this.movementCosts = costs;
  }

  canEnterTerrain(terrain: string, unitType: UnitType): boolean {
    const group = this.terrainGroups[unitType];
    return group ? group.includes(terrain) : false;
  }

  getTerrainMovementCost(terrain: string): number {
    return this.movementCosts[terrain] || 2;
  }

  getUnitType(unit: UnitInstance): UnitType {
    const traits = unit.traits || [];
    if (traits.includes('cavalry')) return 'land';
    if (traits.includes('archer')) return 'land';
    if (traits.includes('infantry')) return 'land';
    return 'land';
  }
}

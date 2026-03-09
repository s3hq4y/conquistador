/**
 * TerrainRegistry - 地形/归属注册模块
 * 
 * 管理地形类型和归属标签的定义
 */

import { 
  TerrainTypeDefinition, 
  OwnerTagDefinition, 
  TerrainTypeInstance, 
  OwnerTagInstance,
  DEFAULT_TERRAIN_TYPES, 
  DEFAULT_OWNER_TAGS, 
  terrainInstanceToDefinition, 
  ownerInstanceToDefinition 
} from '@core/map';

export class TerrainRegistry {
  private terrainTypes: Map<string, TerrainTypeDefinition> = new Map();
  private ownerTags: Map<string, OwnerTagDefinition> = new Map();

  constructor() {
    this.initDefaultDefinitions();
  }

  private initDefaultDefinitions(): void {
    Object.entries(DEFAULT_TERRAIN_TYPES).forEach(([id, instance]) => {
      this.terrainTypes.set(id, terrainInstanceToDefinition(id, instance));
    });
    Object.entries(DEFAULT_OWNER_TAGS).forEach(([id, instance]) => {
      this.ownerTags.set(id, ownerInstanceToDefinition(id, instance));
    });
  }

  getTerrainDef(id: string): TerrainTypeDefinition {
    return this.terrainTypes.get(id) || this.terrainTypes.get('plains')!;
  }

  getOwnerDef(id: string): OwnerTagDefinition {
    return this.ownerTags.get(id) || this.ownerTags.get('neutral')!;
  }

  getAllTerrainTypes(): TerrainTypeDefinition[] {
    return Array.from(this.terrainTypes.values());
  }

  getAllOwnerTags(): OwnerTagDefinition[] {
    return Array.from(this.ownerTags.values());
  }

  addTerrainType(def: TerrainTypeDefinition): void {
    this.terrainTypes.set(def.id, def);
  }

  addOwnerTag(def: OwnerTagDefinition): void {
    this.ownerTags.set(def.id, def);
  }

  updateTerrainType(def: TerrainTypeDefinition): void {
    this.terrainTypes.set(def.id, def);
  }

  updateOwnerTag(def: OwnerTagDefinition): void {
    this.ownerTags.set(def.id, def);
  }

  clear(): void {
    this.terrainTypes.clear();
    this.ownerTags.clear();
  }

  loadFromSceneData(
    terrainTypes: Record<string, TerrainTypeInstance>,
    ownerTags: Record<string, OwnerTagInstance>
  ): void {
    this.terrainTypes.clear();
    this.ownerTags.clear();
    
    Object.entries(terrainTypes).forEach(([id, instance]) => {
      this.terrainTypes.set(id, terrainInstanceToDefinition(id, instance));
    });
    Object.entries(ownerTags).forEach(([id, instance]) => {
      this.ownerTags.set(id, ownerInstanceToDefinition(id, instance));
    });
  }

  toSceneData(): { terrainTypes: Record<string, unknown>; ownerTags: Record<string, unknown> } {
    const terrainTypes: Record<string, unknown> = {};
    const ownerTags: Record<string, unknown> = {};

    for (const [id, def] of this.terrainTypes) {
      terrainTypes[id] = {
        components: {
          name: def.name,
          description: def.description,
          color: def.color,
          icon: def.icon,
          texture: def.texture,
          isWater: def.isWater,
          isPassable: def.isPassable,
          movementCost: def.movementCost
        }
      };
    }

    for (const [id, def] of this.ownerTags) {
      ownerTags[id] = {
        components: {
          name: def.name,
          description: def.description,
          color: def.color,
          icon: def.icon,
          isPlayer: def.isPlayer,
          isAI: def.isAI
        }
      };
    }

    return { terrainTypes, ownerTags };
  }
}

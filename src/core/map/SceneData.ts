import defaultTerrainTypes from '../../data/terrainTypes.json';
import defaultOwnerTags from '../../data/ownerTags.json';

export type HexColor = string;

export interface TerrainTypeDefinition {
  id: string;
  name: string;
  nameZh: string;
  color: HexColor;
  description: string;
  icon: string;
  isWater?: boolean;
  isPassable?: boolean;
  movementCost?: number;
}

export interface OwnerTagDefinition {
  id: string;
  name: string;
  nameZh: string;
  color: HexColor;
  description: string;
  icon: string;
  isPlayer?: boolean;
  isAI?: boolean;
}

export interface TileInstance {
  q: number;
  r: number;
  terrainId: string;
  ownerId: string;
  building: string | null;
  districtKey: string | null;
  preciousDeposit: boolean;
  oilDeposit: boolean;
}

export interface SceneData {
  version: string;
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  settings: {
    hexSize: number;
    defaultTerrain: string;
    defaultOwner: string;
  };
  terrainTypes: TerrainTypeDefinition[];
  ownerTags: OwnerTagDefinition[];
  tiles: TileInstance[];
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

export function rgbToHex(r: number, g: number, b: number): HexColor {
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const DEFAULT_TERRAIN_TYPES: TerrainTypeDefinition[] = defaultTerrainTypes as TerrainTypeDefinition[];

export const DEFAULT_OWNER_TAGS: OwnerTagDefinition[] = defaultOwnerTags as OwnerTagDefinition[];

export function createEmptyScene(name: string = '新场景'): SceneData {
  const now = new Date().toISOString();
  return {
    version: '2.0.0',
    id: `scene_${Date.now()}`,
    name,
    description: '',
    author: 'Anonymous',
    createdAt: now,
    modifiedAt: now,
    settings: {
      hexSize: 50,
      defaultTerrain: 'plains',
      defaultOwner: 'neutral'
    },
    terrainTypes: [...DEFAULT_TERRAIN_TYPES],
    ownerTags: [...DEFAULT_OWNER_TAGS],
    tiles: []
  };
}

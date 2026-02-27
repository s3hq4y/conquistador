import defaultTerrainTypes from '../../data/terrainTypes.json';
import defaultOwnerTags from '../../data/ownerTags.json';

export type HexColor = string;

export interface LocalizedString {
  en: string;
  zh: string;
  [lang: string]: string;
}

export type IconType = 'emoji' | 'svg' | 'image';

export interface IconDefinition {
  type: IconType;
  value?: string;
  path?: string;
}

export type Icon = string | IconDefinition;

export function parseIcon(icon: Icon): IconDefinition {
  if (typeof icon === 'string') {
    return { type: 'emoji', value: icon };
  }
  return icon;
}

export function iconToString(icon: Icon): string {
  const def = parseIcon(icon);
  switch (def.type) {
    case 'emoji':
      return def.value || '';
    case 'svg':
      return def.path ? `[svg:${def.path}]` : def.value || '';
    case 'image':
      return def.path ? `[img:${def.path}]` : '';
    default:
      return '';
  }
}

export interface TerrainComponents {
  name: LocalizedString;
  description: LocalizedString;
  color: HexColor;
  icon: Icon;
  texture?: string;
  isWater?: boolean;
  isPassable?: boolean;
  movementCost?: number;
}

export interface TerrainTypeInstance {
  components: TerrainComponents;
}

export interface TerrainTypeDefinition {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  color: HexColor;
  icon: Icon;
  texture?: string;
  isWater?: boolean;
  isPassable?: boolean;
  movementCost?: number;
}

export interface OwnerComponents {
  name: LocalizedString;
  description: LocalizedString;
  color: HexColor;
  icon: Icon;
  isPlayer?: boolean;
  isAI?: boolean;
}

export interface OwnerTagInstance {
  components: OwnerComponents;
}

export interface OwnerTagDefinition {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  color: HexColor;
  icon: Icon;
  isPlayer?: boolean;
  isAI?: boolean;
}

export interface TileComponents {
  terrain: string;
  owner: string;
  building: string | null;
  district: string | null;
  deposit: string | null;
  capacity?: {
    army: number;
    building: number;
  };
  unitOrder?: string[];
}

export interface TileInstance {
  pos: [number, number];
  components: TileComponents;
}

export interface EdgeInstance {
  tiles: [[number, number], [number, number]];
  type: string;
  properties?: Record<string, unknown>;
}

export interface UnitInstance {
  id: string;
  q: number;
  r: number;
  owner: string;
  traits: string[];
  hp: number;
}

export interface TerrainGroups {
  land: string[];
  sea: string[];
  air: string[];
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
  terrainTypes: Record<string, TerrainTypeInstance>;
  ownerTags: Record<string, OwnerTagInstance>;
  tiles: TileInstance[];
  edges?: EdgeInstance[];
  edgeTypes?: Record<string, EdgeTypeInstance>;
  terrainGroups?: TerrainGroups;
  units?: UnitInstance[];
}

export interface EdgeTypeInstance {
  color: { r: number; g: number; b: number };
  width: number;
  alpha: number;
  layers: number;
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

const terrainData = defaultTerrainTypes as Record<string, TerrainTypeInstance>;
const ownerData = defaultOwnerTags as Record<string, OwnerTagInstance>;

export const DEFAULT_TERRAIN_TYPES: Record<string, TerrainTypeInstance> = terrainData || {};
export const DEFAULT_OWNER_TAGS: Record<string, OwnerTagInstance> = ownerData || {};

export function terrainInstanceToDefinition(id: string, instance: TerrainTypeInstance): TerrainTypeDefinition {
  return {
    id,
    name: instance.components.name,
    description: instance.components.description,
    color: instance.components.color,
    icon: instance.components.icon,
    texture: instance.components.texture,
    isWater: instance.components.isWater,
    isPassable: instance.components.isPassable,
    movementCost: instance.components.movementCost
  };
}

export function ownerInstanceToDefinition(id: string, instance: OwnerTagInstance): OwnerTagDefinition {
  return {
    id,
    name: instance.components.name,
    description: instance.components.description,
    color: instance.components.color,
    icon: instance.components.icon,
    isPlayer: instance.components.isPlayer,
    isAI: instance.components.isAI
  };
}

export function getTerrainDefinitions(instances: Record<string, TerrainTypeInstance>): TerrainTypeDefinition[] {
  return Object.entries(instances).map(([id, instance]) => 
    terrainInstanceToDefinition(id, instance)
  );
}

export function getOwnerDefinitions(instances: Record<string, OwnerTagInstance>): OwnerTagDefinition[] {
  return Object.entries(instances).map(([id, instance]) => 
    ownerInstanceToDefinition(id, instance)
  );
}

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
    terrainTypes: { ...DEFAULT_TERRAIN_TYPES },
    ownerTags: { ...DEFAULT_OWNER_TAGS },
    tiles: [],
    terrainGroups: {
      land: ['plains', 'grassland', 'forest', 'hill', 'mountain', 'desert', 'tundra'],
      sea: ['shallow_sea', 'deep_sea', 'coast'],
      air: ['plains', 'grassland', 'forest', 'hill', 'mountain', 'desert', 'tundra', 'shallow_sea', 'deep_sea', 'coast']
    },
    units: []
  };
}

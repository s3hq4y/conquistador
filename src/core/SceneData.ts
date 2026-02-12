export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface TerrainTypeDefinition {
  id: string;
  name: string;
  nameZh: string;
  color: ColorRGB;
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
  color: ColorRGB;
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

export function colorToRGB(r: number, g: number, b: number): ColorRGB {
  return { r, g, b };
}

export function rgbToHex(color: ColorRGB): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function hexToRGB(hex: string): ColorRGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0.5, g: 0.5, b: 0.5 };
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}

export const DEFAULT_TERRAIN_TYPES: TerrainTypeDefinition[] = [
  { id: 'plains', name: 'Plains', nameZh: '平原', color: { r: 0.35, g: 0.65, b: 0.25 }, description: '基础地形，适合建造和发展', icon: '🌾', isPassable: true, movementCost: 1 },
  { id: 'forest', name: 'Forest', nameZh: '森林', color: { r: 0.15, g: 0.42, b: 0.18 }, description: '提供木材资源，隐蔽加成', icon: '🌲', isPassable: true, movementCost: 2 },
  { id: 'mountain', name: 'Mountain', nameZh: '山地', color: { r: 0.50, g: 0.47, b: 0.42 }, description: '提供防御加成，限制移动', icon: '⛰️', isPassable: true, movementCost: 3 },
  { id: 'desert', name: 'Desert', nameZh: '沙漠', color: { r: 0.85, g: 0.72, b: 0.35 }, description: '资源贫瘠，移动消耗大', icon: '🏜️', isPassable: true, movementCost: 2 },
  { id: 'shallow_sea', name: 'Shallow Sea', nameZh: '浅海', color: { r: 0.22, g: 0.52, b: 0.72 }, description: '可航行，可建造港口', icon: '🌊', isWater: true, isPassable: true, movementCost: 2 },
  { id: 'deep_sea', name: 'Deep Sea', nameZh: '深海', color: { r: 0.10, g: 0.25, b: 0.50 }, description: '仅深海单位可通行', icon: '🌊', isWater: true, isPassable: true, movementCost: 3 },
  { id: 'barrier_mountain', name: 'Barrier Mountain', nameZh: '屏障山', color: { r: 0.25, g: 0.23, b: 0.21 }, description: '不可通行，天然屏障', icon: '🏔️', isPassable: false },
  { id: 'swamp', name: 'Swamp', nameZh: '沼泽', color: { r: 0.32, g: 0.38, b: 0.28 }, description: '移动困难，有疾病风险', icon: '🌿', isPassable: true, movementCost: 3 },
  { id: 'tundra', name: 'Tundra', nameZh: '冻原', color: { r: 0.70, g: 0.76, b: 0.80 }, description: '寒冷地带，资源有限', icon: '❄️', isPassable: true, movementCost: 2 },
  { id: 'volcano', name: 'Volcano', nameZh: '火山', color: { r: 0.60, g: 0.22, b: 0.12 }, description: '危险地形，可能有稀有资源', icon: '🌋', isPassable: true, movementCost: 4 }
];

export const DEFAULT_OWNER_TAGS: OwnerTagDefinition[] = [
  { id: 'neutral', name: 'Neutral', nameZh: '中立', color: { r: 0.50, g: 0.50, b: 0.50 }, description: '中立区域', icon: '⚪', isPlayer: false, isAI: false },
  { id: 'player', name: 'Player', nameZh: '玩家', color: { r: 0.15, g: 0.55, b: 0.92 }, description: '玩家控制区域', icon: '🔵', isPlayer: true, isAI: false },
  { id: 'enemy', name: 'Enemy', nameZh: '敌人', color: { r: 0.92, g: 0.22, b: 0.22 }, description: '敌方控制区域', icon: '🔴', isPlayer: false, isAI: true }
];

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

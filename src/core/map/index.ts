export { HexGrid } from './HexGrid';
export { Tile } from './Tile';
export type { 
  SceneData, 
  TerrainTypeDefinition, 
  TerrainTypeInstance,
  TerrainComponents,
  OwnerTagDefinition,
  TileInstance,
  TileComponents,
  LocalizedString,
  HexColor
} from './SceneData';
export { 
  createEmptyScene,
  DEFAULT_TERRAIN_TYPES,
  DEFAULT_OWNER_TAGS,
  hexToRgb,
  rgbToHex,
  terrainInstanceToDefinition,
  getTerrainDefinitions
} from './SceneData';

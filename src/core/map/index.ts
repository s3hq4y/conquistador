export { HexGrid } from './HexGrid';
export { Tile } from './Tile';
export type { 
  SceneData, 
  TerrainTypeDefinition, 
  TerrainTypeInstance,
  TerrainComponents,
  OwnerTagDefinition,
  OwnerTagInstance,
  OwnerComponents,
  TileInstance,
  TileComponents,
  LocalizedString,
  HexColor,
  Icon,
  IconDefinition,
  IconType,
  EdgeInstance,
  EdgeTypeInstance
} from './SceneData';
export { 
  createEmptyScene,
  DEFAULT_TERRAIN_TYPES,
  DEFAULT_OWNER_TAGS,
  hexToRgb,
  rgbToHex,
  terrainInstanceToDefinition,
  ownerInstanceToDefinition,
  getTerrainDefinitions,
  getOwnerDefinitions,
  parseIcon,
  iconToString
} from './SceneData';
export type { EdgeData, EdgeType, EdgeConfig } from './Edge';
export { DEFAULT_EDGE_CONFIGS, createEdgeKey, getEdgeConfig, setEdgeConfigs } from './Edge';

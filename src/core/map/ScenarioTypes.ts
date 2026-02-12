export type HexColor = string;

export interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  era?: string;
  startDate?: string;
  authors?: string[];
  version?: string;
}

export interface ScenarioSettings {
  hexSize: number;
  mapWidth?: number;
  mapHeight?: number;
  defaultTerrain: string;
  defaultOwner: string;
  wrapX?: boolean;
  wrapY?: boolean;
}

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

export interface ProvinceGeography {
  points: [number, number][];
  neighbors: number[];
}

export interface ProvinceTerrain {
  type: string;
}

export interface ProvinceCity {
  name: string;
  x: number;
  y: number;
  level: number;
}

export interface ProvinceResources {
  food?: Record<string, number>;
  energy?: Record<string, number>;
  raw?: Record<string, number>;
}

export interface ProvinceComponents {
  geography: ProvinceGeography;
  terrain: ProvinceTerrain;
  cities?: ProvinceCity[];
  resources?: ProvinceResources;
  development?: number;
  population?: number;
  urbanization?: number;
}

export interface Province {
  id: number;
  components: ProvinceComponents;
}

export interface Faction {
  id: string;
  name: string;
  type: string;
  power: number;
  radicalism: number;
}

export interface CountryPolitics {
  rulingFactionId?: string;
  stability?: number;
}

export interface CountryTechnology {
  level: number;
  researchedTechs?: string[];
}

export interface CountryEconomyInitialStats {
  developmentIndex?: number;
  economicTotal?: number;
  budget?: number;
  debt?: number;
  totalPopulation?: number;
  averageUrbanizationRate?: number;
  totalResourcesPotential?: Record<string, number>;
  totalResourcesUsed?: Record<string, number>;
}

export interface CountryEconomy {
  provinceDevelopmentMultiplier?: number;
  provincePopulationMultiplier?: number;
  initialStatistics?: CountryEconomyInitialStats;
  initialStocks?: Record<string, number>;
}

export interface CountryDiplomacy {
  bloc?: string;
  allies?: string[];
  enemies?: string[];
  relations?: Record<string, number>;
}

export interface Country {
  id: string;
  aocTag?: string;
  enabled?: boolean;
  color: HexColor;
  name: string;
  shortName?: string;
  adjective?: string;
  capitalProvince?: number;
  primaryCulture?: string;
  cultures?: string[];
  religions?: string[];
  ideology?: string;
  regimeType?: string;
  governmentForm?: string;
  politics?: CountryPolitics;
  factions?: Faction[];
  technology?: CountryTechnology;
  economy?: CountryEconomy;
  diplomacy?: CountryDiplomacy;
}

export interface CountriesFile {
  version: number;
  countries: Country[];
}

export interface DiplomacyEntry {
  tag: string;
  relations?: Record<string, number>;
  alliances?: string[];
  rivals?: string[];
  guarantees?: string[];
}

export interface DiplomacyFile {
  version?: number;
  entries: DiplomacyEntry[];
}

export interface TerrainEconomyDefaults {
  development?: number;
  populationPotential?: number;
  urbanizationPotential?: number;
  infrastructure?: {
    slots?: number;
  };
  province?: {
    provinceResourcesSubcategories?: ProvinceResources;
  };
}

export interface EconomyDefaults {
  version?: number;
  countryAggregation?: {
    defaultDevelopmentIndex?: number;
    majorThresholdDevelopmentIndex?: number;
    majorDebtRatio?: number;
    minorDebtRatio?: number;
    majorBudgetRatio?: number;
    minorBudgetRatio?: number;
  };
  defaultsByTerrain?: Record<string, TerrainEconomyDefaults>;
}

export interface Building {
  id: string;
  name: string;
  nameZh?: string;
  category?: string;
  cost?: Record<string, number>;
  effects?: Record<string, number>;
  requirements?: string[];
  terrainTypes?: string[];
}

export interface BuildingsFile {
  version?: number;
  buildings: Building[];
}

export interface ResourceLabel {
  id: string;
  name: string;
  nameZh?: string;
  category: string;
  icon?: string;
}

export interface ResourceLabelsFile {
  version?: number;
  labels: ResourceLabel[];
}

export interface MilitaryTag {
  id: string;
  name: string;
  nameZh?: string;
  category?: string;
  modifiers?: Record<string, number>;
}

export interface MilitaryTagsFile {
  version?: number;
  tags: MilitaryTag[];
}

export interface MilitaryTagModifier {
  id: string;
  name: string;
  modifiers?: Record<string, number>;
}

export interface MilitaryTagModifiersFile {
  version?: number;
  modifiers: MilitaryTagModifier[];
}

export interface MilitaryTagConversion {
  from: string;
  to: string;
  conditions?: Record<string, unknown>;
}

export interface MilitaryTagConversionsFile {
  version?: number;
  conversions: MilitaryTagConversion[];
}

export interface Equipment {
  id: string;
  name: string;
  nameZh?: string;
  category: string;
  stats?: Record<string, number>;
  cost?: Record<string, number>;
  requirements?: string[];
}

export interface EquipmentLibraryFile {
  version?: number;
  equipment: Equipment[];
}

export interface UnitTemplate {
  id: string;
  name: string;
  nameZh?: string;
  category: string;
  baseStats?: Record<string, number>;
  equipment?: string[];
  tags?: string[];
  cost?: Record<string, number>;
}

export interface UnitTemplatesFile {
  version?: number;
  templates: UnitTemplate[];
}

export interface Army {
  id: string;
  name: string;
  ownerTag: string;
  provinceId: number;
  units?: Array<{
    templateId: string;
    count: number;
    experience?: number;
  }>;
}

export interface ArmiesFile {
  version?: number;
  armies: Army[];
}

export interface BattleConstants {
  baseDamage?: number;
  defenseMultiplier?: number;
  terrainModifiers?: Record<string, number>;
  experienceBonus?: number;
}

export interface BattleConstantsFile {
  version?: number;
  constants: BattleConstants;
}

export interface MovementRules {
  baseMovementPoints?: number;
  terrainMovementCost?: Record<string, number>;
  roadBonus?: number;
  riverCrossingCost?: number;
}

export interface MovementRulesFile {
  version?: number;
  rules: MovementRules;
}

export interface TechNode {
  id: string;
  name: string;
  nameZh?: string;
  category: string;
  era?: string;
  cost?: number;
  effects?: Record<string, number>;
  prerequisites?: string[];
  unlocks?: string[];
}

export interface TechTreeFile {
  version?: number;
  nodes: TechNode[];
}

export interface TechResearch {
  tag: string;
  currentResearch?: string;
  progress?: number;
  researchedTechs?: string[];
}

export interface TechResearchFile {
  version?: number;
  entries: TechResearch[];
}

export interface TileInstance {
  q: number;
  r: number;
  terrainId: string;
  ownerId: string;
  provinceId?: number;
  building: string | null;
  districtKey: string | null;
  preciousDeposit: boolean;
  oilDeposit: boolean;
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

export interface LegacySceneData {
  version: string;
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  settings: ScenarioSettings;
  terrainTypes: TerrainTypeDefinition[];
  ownerTags: OwnerTagDefinition[];
  tiles: TileInstance[];
}

export interface ScenarioData {
  meta: ScenarioMeta;
  settings: ScenarioSettings;
  terrainTypes: TerrainTypeDefinition[];
  provinces: Province[];
  countries: CountriesFile;
  diplomacy?: DiplomacyFile;
  economy?: EconomyDefaults;
  buildings?: BuildingsFile;
  resourceLabels?: ResourceLabelsFile;
  military?: {
    tags?: MilitaryTagsFile;
    tagModifiers?: MilitaryTagModifiersFile;
    tagConversions?: MilitaryTagConversionsFile;
    equipmentLibrary?: EquipmentLibraryFile;
    unitTemplates?: UnitTemplatesFile;
    armies?: ArmiesFile;
    battleConstants?: BattleConstantsFile;
    movementRules?: MovementRulesFile;
  };
  techTree?: TechTreeFile;
  techResearch?: TechResearchFile;
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

export const DEFAULT_TERRAIN_TYPES: TerrainTypeDefinition[] = [];
export const DEFAULT_OWNER_TAGS: Country[] = [];

export function createEmptyScenario(name: string = '新场景'): ScenarioData {
  return {
    meta: {
      id: `scenario_${Date.now()}`,
      name,
      description: '',
      version: '1.0.0'
    },
    settings: {
      hexSize: 50,
      defaultTerrain: 'plains',
      defaultOwner: 'neutral'
    },
    terrainTypes: [],
    provinces: [],
    countries: { version: 1, countries: [] },
    tiles: []
  };
}

export function createEmptyScene(name: string = '新场景'): LegacySceneData {
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
    ownerTags: [],
    tiles: []
  };
}

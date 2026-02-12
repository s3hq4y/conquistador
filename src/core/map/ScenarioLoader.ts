import type {
  ScenarioData,
  ScenarioMeta,
  ScenarioSettings,
  TerrainTypeDefinition,
  Province,
  CountriesFile,
  DiplomacyFile,
  EconomyDefaults,
  BuildingsFile,
  ResourceLabelsFile,
  MilitaryTagsFile,
  EquipmentLibraryFile,
  UnitTemplatesFile,
  ArmiesFile,
  BattleConstantsFile,
  TechTreeFile,
  TechResearchFile,
  TileInstance
} from './ScenarioTypes';

export interface LoadedScenario {
  meta: ScenarioMeta;
  settings: ScenarioSettings;
  terrainTypes: TerrainTypeDefinition[];
  provinces: Province[];
  countries: CountriesFile;
  diplomacy?: DiplomacyFile;
  economy?: EconomyDefaults;
  buildings?: BuildingsFile;
  resourceLabels?: ResourceLabelsFile;
  military: {
    tags?: MilitaryTagsFile;
    equipmentLibrary?: EquipmentLibraryFile;
    unitTemplates?: UnitTemplatesFile;
    armies?: ArmiesFile;
    battleConstants?: BattleConstantsFile;
  };
  techTree?: TechTreeFile;
  techResearch?: TechResearchFile;
  tiles: TileInstance[];
}

export class ScenarioLoader {
  private basePath: string;

  constructor(scenarioId: string) {
    this.basePath = `/scenes/${scenarioId}`;
  }

  async load(): Promise<LoadedScenario> {
    const [
      meta,
      settings,
      terrainTypes,
      provinces,
      countries,
      diplomacy,
      economy,
      buildings,
      resourceLabels,
      militaryTags,
      equipmentLibrary,
      unitTemplates,
      armies,
      battleConstants,
      techTree,
      techResearch,
      tiles
    ] = await Promise.all([
      this.fetchJson<ScenarioMeta>('scenario_meta.json'),
      this.fetchJson<ScenarioSettings>('settings.json'),
      this.fetchJson<TerrainTypeDefinition[]>('terrain_types.json'),
      this.fetchJson<Province[]>('provinces/provinces.ecs.json'),
      this.fetchJson<CountriesFile>('civ_meta/countries.json'),
      this.fetchJson<DiplomacyFile>('civ_meta/diplomacy.json').catch(() => undefined),
      this.fetchJson<EconomyDefaults>('economy/economy_defaults.json').catch(() => undefined),
      this.fetchJson<BuildingsFile>('economy/buildings.json').catch(() => undefined),
      this.fetchJson<ResourceLabelsFile>('economy/resource_labels.json').catch(() => undefined),
      this.fetchJson<MilitaryTagsFile>('military/tags.json').catch(() => undefined),
      this.fetchJson<EquipmentLibraryFile>('military/equipment_library.json').catch(() => undefined),
      this.fetchJson<UnitTemplatesFile>('military/unit_templates.json').catch(() => undefined),
      this.fetchJson<ArmiesFile>('military/armies.json').catch(() => undefined),
      this.fetchJson<BattleConstantsFile>('military/config/battle_constants.json').catch(() => undefined),
      this.fetchJson<TechTreeFile>('tech_tree.json').catch(() => undefined),
      this.fetchJson<TechResearchFile>('civ_meta/tech_research.json').catch(() => undefined),
      this.fetchJson<TileInstance[]>('tiles.json')
    ]);

    return {
      meta,
      settings,
      terrainTypes: terrainTypes || [],
      provinces: provinces || [],
      countries: countries || { version: 1, countries: [] },
      diplomacy,
      economy,
      buildings,
      resourceLabels,
      military: {
        tags: militaryTags,
        equipmentLibrary,
        unitTemplates,
        armies,
        battleConstants
      },
      techTree,
      techResearch,
      tiles: tiles || []
    };
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.basePath}/${path}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return response.json();
  }

  static async loadScenario(scenarioId: string): Promise<LoadedScenario> {
    const loader = new ScenarioLoader(scenarioId);
    return loader.load();
  }

  static convertToLegacyFormat(scenario: LoadedScenario): ScenarioData {
    return {
      meta: scenario.meta,
      settings: scenario.settings,
      terrainTypes: scenario.terrainTypes,
      provinces: scenario.provinces,
      countries: scenario.countries,
      diplomacy: scenario.diplomacy,
      economy: scenario.economy,
      buildings: scenario.buildings,
      resourceLabels: scenario.resourceLabels,
      military: {
        tags: scenario.military.tags,
        tagModifiers: undefined,
        tagConversions: undefined,
        equipmentLibrary: scenario.military.equipmentLibrary,
        unitTemplates: scenario.military.unitTemplates,
        armies: scenario.military.armies,
        battleConstants: scenario.military.battleConstants,
        movementRules: undefined
      },
      techTree: scenario.techTree,
      techResearch: scenario.techResearch,
      tiles: scenario.tiles
    };
  }
}

export type { ScenarioData };

export interface LocalizedString {
  zh: string;
  en: string;
}

export interface UnitStats {
  hp: number;
  attack: number;
  defense: number;
  movement: number;
  range: number;
}

export interface UnitCost {
  ducat?: number;
  food?: number;
  [key: string]: number | undefined;
}

export interface UnitRequirements {
  building: string | null;
  technology: string | null;
}

export interface UnitBonuses {
  vsCavalry?: number;
  vsInfantry?: number;
  vsArcher?: number;
  vsHeavyArmor?: number;
  defenseBonus?: number;
  attackBonus?: number;
  firstStrike?: boolean;
  charge?: boolean;
  movementBonus?: number;
  [key: string]: number | boolean | undefined;
}

export interface RecruitUnitType {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  icon: string;
  category: 'infantry' | 'ranged' | 'cavalry' | 'siege' | 'naval';
  tier: number;
  baseStats: UnitStats;
  traits: string[];
  cost: UnitCost;
  recruitTime: number;
  requirements: UnitRequirements;
  bonuses?: UnitBonuses;
  visible: boolean;
}

export interface RecruitSlot {
  unitType: string;
  unlockTurn: number;
  costMultiplier: number;
}

export interface BuildingProduction {
  ducat?: number;
  food?: number;
  experience?: number;
  [key: string]: number | undefined;
}

export interface RecruitBuildingConfig {
  name: LocalizedString;
  description?: LocalizedString;
  icon: string;
  capacity: number;
  recruitSlots: RecruitSlot[];
  productionPerTurn: BuildingProduction;
}

export interface RecruitBuildingsData {
  recruitBuildings: Record<string, RecruitBuildingConfig>;
}

export interface RecruitUnitsData {
  units: Record<string, RecruitUnitType>;
}

export interface UnitCategory {
  name: string;
  icon: string;
}

export interface UnitManifest {
  version: string;
  description: string;
  files: {
    recruit_units: string;
    buildings: string;
  };
  categories: Record<string, UnitCategory>;
}

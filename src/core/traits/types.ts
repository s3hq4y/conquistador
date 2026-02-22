export interface UnitStats {
  hp?: number;
  attack?: number;
  defense?: number;
  movement?: number;
  range?: number;
}

export type TraitType = 'soldierType' | 'weapon' | 'armor' | 'tag' | 'ability';

export interface TraitTypeDefinition {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export type BonusType = 'multiply' | 'add';

export interface CombatBonus {
  targetTrait: string;
  bonusType: BonusType;
  value: number;
  description?: string;
}

export type EffectType = 'linear' | 'threshold' | 'percentage';

export interface StateEffect {
  state: string;
  stat: string;
  type: EffectType;
  value?: number;
  minPercent?: number;
  maxPercent?: number;
}

export interface Trait {
  id: string;
  name: string;
  type: TraitType;
  description?: string;
  requires?: string[];
  children?: string[];
  stats?: UnitStats;
  tags?: string[];
  combatBonuses?: CombatBonus[];
  stateEffects?: StateEffect[];
}

export interface TraitData {
  traitTypes?: Record<string, TraitTypeDefinition>;
  traits: Record<string, Trait>;
}

export const DEFENSE_CONSTANT = 100;

export function calculateDamageReduction(defense: number): number {
  return defense / (defense + DEFENSE_CONSTANT);
}

export function calculateEffectiveDamage(baseDamage: number, defense: number): number {
  const reduction = calculateDamageReduction(defense);
  return baseDamage * (1 - reduction);
}

export function mergeStats(base: UnitStats, addition: UnitStats): UnitStats {
  return {
    hp: (base.hp ?? 0) + (addition.hp ?? 0),
    attack: (base.attack ?? 0) + (addition.attack ?? 0),
    defense: (base.defense ?? 0) + (addition.defense ?? 0),
    movement: (base.movement ?? 0) + (addition.movement ?? 0),
    range: (base.range ?? 0) + (addition.range ?? 0),
  };
}

export function createEmptyStats(): UnitStats {
  return {
    hp: 0,
    attack: 0,
    defense: 0,
    movement: 0,
    range: 0,
  };
}

export const DEFAULT_TRAIT_TYPES: Record<string, TraitTypeDefinition> = {
  soldierType: { id: 'soldierType', name: '兵种', icon: '⚔️', description: '单位的基础类型' },
  weapon: { id: 'weapon', name: '武器', icon: '🗡️', description: '单位装备的武器' },
  armor: { id: 'armor', name: '护甲', icon: '🛡️', description: '单位装备的护甲' },
  tag: { id: 'tag', name: '标签', icon: '🏷️', description: '分类标签，无属性加成' },
  ability: { id: 'ability', name: '能力', icon: '⭐', description: '特殊能力或技能' }
};

import {
  Trait,
  TraitData,
  TraitTypeDefinition,
  UnitStats,
  CombatBonus,
  mergeStats,
  createEmptyStats,
  DEFAULT_TRAIT_TYPES,
  StateEffect,
} from './types';
import { StateCalculator } from './StateCalculator';

export class TraitManager {
  private traits: Map<string, Trait> = new Map();
  private traitTypes: Map<string, TraitTypeDefinition> = new Map();
  private traitChildrenCache: Map<string, Set<string>> = new Map();
  private stateCalculator: StateCalculator = new StateCalculator();

  loadTraitData(data: TraitData): void {
    this.traits.clear();
    this.traitTypes.clear();
    this.traitChildrenCache.clear();

    if (data.traitTypes) {
      for (const [id, typeDef] of Object.entries(data.traitTypes)) {
        this.traitTypes.set(id, typeDef);
      }
    } else {
      for (const [id, typeDef] of Object.entries(DEFAULT_TRAIT_TYPES)) {
        this.traitTypes.set(id, typeDef);
      }
    }

    for (const [id, trait] of Object.entries(data.traits)) {
      this.traits.set(id, trait);
    }

    this.buildChildrenCache();
    this.validateDependencies();
  }

  private buildChildrenCache(): void {
    for (const id of this.traits.keys()) {
      const allChildren = this.collectAllChildren(id);
      this.traitChildrenCache.set(id, allChildren);
    }
  }

  private collectAllChildren(traitId: string, visited: Set<string> = new Set()): Set<string> {
    const result = new Set<string>();
    
    if (visited.has(traitId)) {
      return result;
    }
    visited.add(traitId);

    const trait = this.traits.get(traitId);
    if (!trait) return result;

    if (trait.children) {
      for (const childId of trait.children) {
        result.add(childId);
        const childTrait = this.traits.get(childId);
        if (childTrait) {
          const nestedChildren = this.collectAllChildren(childId, visited);
          for (const nc of nestedChildren) {
            result.add(nc);
          }
        }
      }
    }

    return result;
  }

  private validateDependencies(): void {
    for (const [id, trait] of this.traits) {
      if (trait.requires) {
        for (const reqId of trait.requires) {
          if (!this.traits.has(reqId)) {
            console.warn(`Trait "${id}" requires non-existent trait "${reqId}"`);
          }
        }
      }
      if (trait.children) {
        for (const childId of trait.children) {
          if (!this.traits.has(childId)) {
            console.warn(`Trait "${id}" has non-existent child trait "${childId}"`);
          }
        }
      }
    }
  }

  getTraitType(id: string): TraitTypeDefinition | undefined {
    return this.traitTypes.get(id);
  }

  getAllTraitTypes(): Map<string, TraitTypeDefinition> {
    return this.traitTypes;
  }

  getTrait(id: string): Trait | undefined {
    return this.traits.get(id);
  }

  getAllTraits(): Map<string, Trait> {
    return this.traits;
  }

  getAllTraitIds(): string[] {
    return Array.from(this.traits.keys());
  }

  getTraitsByType(type: string): Trait[] {
    const result: Trait[] = [];
    for (const trait of this.traits.values()) {
      if (trait.type === type) {
        result.push(trait);
      }
    }
    return result;
  }

  getAllChildren(traitId: string): Set<string> {
    return this.traitChildrenCache.get(traitId) || new Set();
  }

  getUnitAllTraits(traitIds: string[]): Trait[] {
    const allTraits: Trait[] = [];
    const addedIds = new Set<string>();

    for (const id of traitIds) {
      const trait = this.traits.get(id);
      if (trait && !addedIds.has(id)) {
        allTraits.push(trait);
        addedIds.add(id);

        const children = this.getAllChildren(id);
        for (const childId of children) {
          if (!addedIds.has(childId)) {
            const childTrait = this.traits.get(childId);
            if (childTrait) {
              allTraits.push(childTrait);
              addedIds.add(childId);
            }
          }
        }
      }
    }

    return allTraits;
  }

  getUnitAllTraitIds(traitIds: string[]): string[] {
    const allIds = new Set<string>();

    for (const id of traitIds) {
      allIds.add(id);
      const children = this.getAllChildren(id);
      for (const childId of children) {
        allIds.add(childId);
      }
    }

    return Array.from(allIds);
  }

  calculateStats(traitIds: string[], stateValues?: Map<string, number>): UnitStats {
    const allTraits = this.getUnitAllTraits(traitIds);
    let stats = createEmptyStats();

    for (const trait of allTraits) {
      if (trait.stats) {
        stats = mergeStats(stats, trait.stats);
      }
    }

    if (stateValues && stateValues.size > 0) {
      const stateEffects: StateEffect[] = [];
      for (const trait of allTraits) {
        if (trait.stateEffects) {
          stateEffects.push(...trait.stateEffects);
        }
      }

      if (stateEffects.length > 0) {
        const statsRecord: Record<string, number> = {
          hp: stats.hp ?? 0,
          attack: stats.attack ?? 0,
          defense: stats.defense ?? 0,
          movement: stats.movement ?? 0,
          range: stats.range ?? 0,
        };

        const affectedStats = this.stateCalculator.applyStateEffects(
          statsRecord,
          stateEffects,
          stateValues
        );

        stats = {
          hp: affectedStats.hp,
          attack: affectedStats.attack,
          defense: affectedStats.defense,
          movement: affectedStats.movement,
          range: affectedStats.range,
        };
      }
    }

    return stats;
  }

  getCombatBonuses(traitId: string): CombatBonus[] {
    const trait = this.traits.get(traitId);
    return trait?.combatBonuses || [];
  }

  getUnitCombatBonuses(traitIds: string[]): Map<string, CombatBonus[]> {
    const allTraits = this.getUnitAllTraits(traitIds);
    const bonusMap = new Map<string, CombatBonus[]>();

    for (const trait of allTraits) {
      if (trait.combatBonuses && trait.combatBonuses.length > 0) {
        bonusMap.set(trait.id, trait.combatBonuses);
      }
    }

    return bonusMap;
  }

  hasTrait(traitIds: string[], traitId: string): boolean {
    const allIds = this.getUnitAllTraitIds(traitIds);
    return allIds.includes(traitId);
  }

  hasAnyTrait(traitIds: string[], checkIds: string[]): boolean {
    const allIds = new Set(this.getUnitAllTraitIds(traitIds));
    return checkIds.some(id => allIds.has(id));
  }
}

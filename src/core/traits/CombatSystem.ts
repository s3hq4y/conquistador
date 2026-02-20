import { TraitManager } from './TraitManager';
import { calculateEffectiveDamage, UnitStats } from './types';

export interface CombatResult {
  attackerDamage: number;
  defenderDamage: number;
  attackerHpLost: number;
  defenderHpLost: number;
  attackerDied: boolean;
  defenderDied: boolean;
}

export interface CombatUnit {
  traitIds: string[];
  stats: UnitStats;
  currentHp: number;
}

export interface AppliedCombatBonus {
  sourceTrait: string;
  targetTrait: string;
  bonusType: 'multiply' | 'add';
  value: number;
  description?: string;
}

export class CombatSystem {
  private traitManager: TraitManager;

  constructor(traitManager: TraitManager) {
    this.traitManager = traitManager;
  }

  calculateMultiplierBonus(attackerTraitIds: string[], defenderTraitIds: string[]): number {
    let totalMultiplierBonus = 0;

    const attackerAllIds = this.traitManager.getUnitAllTraitIds(attackerTraitIds);
    const defenderAllIdsSet = new Set(this.traitManager.getUnitAllTraitIds(defenderTraitIds));

    for (const attackerTraitId of attackerAllIds) {
      const bonuses = this.traitManager.getCombatBonuses(attackerTraitId);
      for (const bonus of bonuses) {
        if (bonus.bonusType !== 'multiply') continue;
        if (defenderAllIdsSet.has(bonus.targetTrait)) {
          totalMultiplierBonus += bonus.value - 1;
        }
      }
    }

    return 1 + totalMultiplierBonus;
  }

  calculateAddBonus(attackerTraitIds: string[], defenderTraitIds: string[]): number {
    let totalAddBonus = 0;

    const attackerAllIds = this.traitManager.getUnitAllTraitIds(attackerTraitIds);
    const defenderAllIdsSet = new Set(this.traitManager.getUnitAllTraitIds(defenderTraitIds));

    for (const attackerTraitId of attackerAllIds) {
      const bonuses = this.traitManager.getCombatBonuses(attackerTraitId);
      for (const bonus of bonuses) {
        if (bonus.bonusType !== 'add') continue;
        if (defenderAllIdsSet.has(bonus.targetTrait)) {
          totalAddBonus += bonus.value;
        }
      }
    }

    return totalAddBonus;
  }

  calculateDamage(
    attacker: CombatUnit,
    defender: CombatUnit
  ): number {
    const baseAttack = attacker.stats.attack ?? 0;
    const defenderDefense = defender.stats.defense ?? 0;

    const multiplierBonus = this.calculateMultiplierBonus(attacker.traitIds, defender.traitIds);
    const addBonus = this.calculateAddBonus(attacker.traitIds, defender.traitIds);

    const modifiedAttack = (baseAttack + addBonus) * multiplierBonus;

    const effectiveDamage = calculateEffectiveDamage(modifiedAttack, defenderDefense);

    return Math.max(1, Math.round(effectiveDamage));
  }

  executeCombat(attacker: CombatUnit, defender: CombatUnit): CombatResult {
    const attackerDamage = this.calculateDamage(attacker, defender);
    const defenderDamage = this.calculateDamage(defender, attacker);

    const defenderHpLost = Math.min(attackerDamage, defender.currentHp);
    const attackerHpLost = Math.min(defenderDamage, attacker.currentHp);

    const defenderDied = defender.currentHp - defenderHpLost <= 0;
    const attackerDied = attacker.currentHp - attackerHpLost <= 0;

    return {
      attackerDamage,
      defenderDamage,
      attackerHpLost,
      defenderHpLost,
      attackerDied,
      defenderDied,
    };
  }

  getCombatPreview(attacker: CombatUnit, defender: CombatUnit): {
    attackerDamage: number;
    defenderDamage: number;
    multiplierBonus: number;
    addBonus: number;
  } {
    const multiplierBonus = this.calculateMultiplierBonus(attacker.traitIds, defender.traitIds);
    const addBonus = this.calculateAddBonus(attacker.traitIds, defender.traitIds);
    const attackerDamage = this.calculateDamage(attacker, defender);
    const defenderDamage = this.calculateDamage(defender, attacker);

    return {
      attackerDamage,
      defenderDamage,
      multiplierBonus,
      addBonus,
    };
  }

  getApplicableBonuses(attackerTraitIds: string[], defenderTraitIds: string[]): AppliedCombatBonus[] {
    const applicable: AppliedCombatBonus[] = [];

    const attackerAllIds = this.traitManager.getUnitAllTraitIds(attackerTraitIds);
    const defenderAllIdsSet = new Set(this.traitManager.getUnitAllTraitIds(defenderTraitIds));

    for (const attackerTraitId of attackerAllIds) {
      const bonuses = this.traitManager.getCombatBonuses(attackerTraitId);
      for (const bonus of bonuses) {
        if (defenderAllIdsSet.has(bonus.targetTrait)) {
          applicable.push({
            sourceTrait: attackerTraitId,
            targetTrait: bonus.targetTrait,
            bonusType: bonus.bonusType,
            value: bonus.value,
            description: bonus.description,
          });
        }
      }
    }

    return applicable;
  }
}

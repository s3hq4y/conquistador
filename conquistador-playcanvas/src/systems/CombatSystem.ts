import { GameSystem } from './GameSystem';
import { Unit } from '../core/Unit';
import type { GameEngine } from '../engine/GameEngine';

export class CombatSystem extends GameSystem {
  private units: Map<string, Unit> = new Map();

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.units.clear();
  }

  addUnit(unit: Unit): void {
    this.units.set(unit.id, unit);
  }

  removeUnit(id: string): void {
    this.units.delete(id);
  }

  getUnit(id: string): Unit | undefined {
    return this.units.get(id);
  }

  getUnits(): Unit[] {
    return Array.from(this.units.values());
  }

  resolveCombat(attacker: Unit, defender: Unit): void {
    const attackerDamage = this.calculateDamage(attacker, defender);
    const defenderDamage = this.calculateDamage(defender, attacker);

    attacker.takeDamage(defenderDamage);
    defender.takeDamage(attackerDamage);

    if (!attacker.isAlive()) {
      this.removeUnit(attacker.id);
    }

    if (!defender.isAlive()) {
      this.removeUnit(defender.id);
    }
  }

  private calculateDamage(_attacker: Unit, _defender: Unit): number {
    return Math.floor(Math.random() * 20) + 10;
  }
}

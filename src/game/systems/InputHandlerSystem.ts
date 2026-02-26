import { GameSystem } from '../../core/systems';
import type { GameEngine } from '../../core/engine';
import { MapSystem, MovementSystem, UnitRenderSystem } from '../../core/systems';
import type { UnitInstance } from '../../core/map';
import { TraitManager } from '../../core/traits/TraitManager';
import { CombatSystem } from '../../core/traits/CombatSystem';
import { SelectionSystem } from './SelectionSystem';
import { useGameEventStore } from '../../stores/gameEvent';
import { debug } from '../../core/utils/debug';

export class InputHandlerSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private unitRenderSystem: UnitRenderSystem | null = null;
  private traitManager: TraitManager | null = null;
  private combatSystem: CombatSystem | null = null;
  private selectionSystem: SelectionSystem | null = null;
  private gameEventStore = useGameEventStore();

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;
    this.unitRenderSystem = this.engine.getSystems().find(s => s instanceof UnitRenderSystem) as UnitRenderSystem;

    this.setupInputHandlers();
  }

  setDependencies(selectionSystem: SelectionSystem, traitManager: TraitManager, combatSystem: CombatSystem): void {
    this.selectionSystem = selectionSystem;
    this.traitManager = traitManager;
    this.combatSystem = combatSystem;
  }

  private setupInputHandlers(): void {
    const eventBus = this.engine.getEventBus();

    eventBus.on('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.gameEventStore.isAITurn) return;
    if (!this.mapSystem || !this.movementSystem || !this.unitRenderSystem) return;
    if (e.button !== 0) return;

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);
    const tileKey = `${hexPos.q},${hexPos.r}`;

    const clickedUnit = this.movementSystem.getUnitAt(hexPos.q, hexPos.r);

    if (clickedUnit) {
      if (this.selectionSystem?.isCurrentPlayerUnit(clickedUnit)) {
        this.selectionSystem.clearSelection();
        this.selectionSystem.selectUnit(clickedUnit);
        return;
      } else {
        this.selectionSystem?.selectEnemyUnit(clickedUnit);

        if (this.selectionSystem?.isTileAttackable(tileKey)) {
          this.executeAttack(this.selectionSystem.getSelectedUnitId()!, clickedUnit);
          return;
        }
      }
    }

    const reachableTiles = this.selectionSystem?.getReachableTiles() ?? new Set();

    if (reachableTiles.has(tileKey)) {
      const success = this.unitRenderSystem.moveSelectedUnit(hexPos.q, hexPos.r);
      if (success) {
        debug.movement('Moved to', hexPos.q, hexPos.r);
        const selectedId = this.unitRenderSystem.getSelectedUnitId();
        if (selectedId) {
          this.unitRenderSystem.selectUnit(selectedId);
          const unit = this.movementSystem?.getUnit(selectedId);
          if (unit && this.movementSystem?.canAttack(unit.id)) {
            this.selectionSystem?.highlightAttackableTiles(unit);
          }
        }
      }
      return;
    }

    this.selectionSystem?.deselectUnit();
    this.selectionSystem?.selectTile(tileKey, hexPos.q, hexPos.r);
  }

  private executeAttack(attackerId: string, defender: UnitInstance): void {
    if (!this.movementSystem || !this.combatSystem || !this.traitManager || !this.selectionSystem) return;

    const attacker = this.movementSystem.getUnit(attackerId);
    if (!attacker) return;

    const attackerStats = this.traitManager.calculateStats(attacker.traits, this.calculateUnitStateValues(attacker));
    const defenderStats = this.traitManager.calculateStats(defender.traits, this.calculateUnitStateValues(defender));

    const distance = this.calculateDistance(attacker.q, attacker.r, defender.q, defender.r);
    const defenderRange = defenderStats.range ?? 1;
    const canDefenderCounterAttack = distance <= defenderRange;

    const attackerCombatUnit = {
      traitIds: attacker.traits,
      stats: attackerStats,
      currentHp: attacker.hp
    };

    const defenderCombatUnit = {
      traitIds: defender.traits,
      stats: defenderStats,
      currentHp: defender.hp
    };

    this.gameEventStore.startCombat(attackerId, defender.id);

    setTimeout(() => {
      const result = this.combatSystem!.executeCombat(attackerCombatUnit, defenderCombatUnit, canDefenderCounterAttack);

      debug.combat('Combat result:', result);
      debug.combat(`Attacker dealt ${result.defenderHpLost} damage, Defender dealt ${result.attackerHpLost} damage`);
      debug.combat(`Distance: ${distance}, Defender range: ${defenderRange}, Can counter: ${canDefenderCounterAttack}`);

      attacker.hp -= result.attackerHpLost;
      defender.hp -= result.defenderHpLost;

      if (this.unitRenderSystem) {
        if (attacker.hp > 0) {
          this.unitRenderSystem.updateUnitHpBar(attackerId);
          this.unitRenderSystem.playDamageAnimation(attackerId);
        }
        if (defender.hp > 0) {
          this.unitRenderSystem.updateUnitHpBar(defender.id);
        }
      }

      if (attacker.hp <= 0) {
        this.movementSystem!.removeUnit(attackerId);
        debug.combat('Attacker died');
      }

      if (defender.hp <= 0) {
        this.movementSystem!.removeUnit(defender.id);
        debug.combat('Defender died');
      }

      if (this.unitRenderSystem) {
        this.unitRenderSystem.selectUnit(null);
      }
      this.selectionSystem?.clearAttackHighlights();

      if (attacker.hp > 0) {
        this.movementSystem!.setAttacked(attackerId);
        this.movementSystem!.clearMovement(attackerId);
      }

      this.gameEventStore.setCombatResult({
        attackerId,
        defenderId: defender.id,
        damage: result.defenderHpLost,
        defenderDamage: result.attackerHpLost,
        attackerSurvived: attacker.hp > 0,
        defenderSurvived: defender.hp > 0
      });
    }, 300);
  }

  private calculateDistance(q1: number, r1: number, q2: number, r2: number): number {
    const dq = q1 - q2;
    const dr = r1 - r2;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  }

  private calculateUnitStateValues(unit: UnitInstance): Map<string, number> {
    if (!this.traitManager) return new Map();

    const baseStats = this.traitManager.calculateStats(unit.traits);
    const maxHp = baseStats.hp ?? unit.hp;
    const hpPercent = (unit.hp / maxHp) * 100;

    const stateValues = new Map<string, number>();
    stateValues.set('hp', hpPercent);

    return stateValues;
  }

  update(_dt: number): void {
  }

  dispose(): void {
    const eventBus = this.engine.getEventBus();
    eventBus.off('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });
  }
}

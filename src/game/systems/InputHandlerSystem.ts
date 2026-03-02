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

    if (this.gameEventStore.showTileUnits) {
      this.gameEventStore.clearTileUnits();
    }

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);
    const tileKey = `${hexPos.q},${hexPos.r}`;

    const clickedUnits = this.movementSystem.getUnitsAt(hexPos.q, hexPos.r);

    if (clickedUnits.length > 0) {
      this.selectionSystem?.selectTile(tileKey, hexPos.q, hexPos.r);
      
      const topUnit = this.movementSystem.getTopUnitAt(hexPos.q, hexPos.r);
      if (!topUnit) {
        this.checkAndShowBuildPanel(hexPos.q, hexPos.r);
        return;
      }

      if (this.selectionSystem?.isCurrentPlayerUnit(topUnit)) {
        this.selectionSystem.selectUnit(topUnit);
        this.checkAndShowBuildPanel(hexPos.q, hexPos.r);
        return;
      } else {
        this.selectionSystem?.selectEnemyUnit(topUnit);

        if (this.selectionSystem?.isTileAttackable(tileKey)) {
          this.executeAttack(this.selectionSystem.getSelectedUnitId()!, topUnit);
          return;
        }
      }
      this.checkAndShowBuildPanel(hexPos.q, hexPos.r);
      return;
    }

    this.checkAndShowBuildPanel(hexPos.q, hexPos.r);

    const reachableTiles = this.selectionSystem?.getReachableTiles() ?? new Set();

    if (reachableTiles.has(tileKey)) {
      const selectedId = this.unitRenderSystem.getSelectedUnitId();
      if (!selectedId) return;

      const selectedUnit = this.movementSystem.getUnit(selectedId);
      if (!selectedUnit) return;

      const oldTile = this.movementSystem.getTileAt(selectedUnit.q, selectedUnit.r);
      if (oldTile) {
        oldTile.removeUnit(selectedId);
      }

      const success = this.unitRenderSystem.moveSelectedUnit(hexPos.q, hexPos.r);
      if (success) {
        const newTile = this.movementSystem.getTileAt(hexPos.q, hexPos.r);
        if (newTile) {
          newTile.addUnit(selectedId);
        }

        debug.movement('Moved to', hexPos.q, hexPos.r);
        const newSelectedId = this.unitRenderSystem.getSelectedUnitId();
        if (newSelectedId) {
          this.unitRenderSystem.selectUnit(newSelectedId);
          const unit = this.movementSystem?.getUnit(newSelectedId);
          if (unit && this.movementSystem?.canAttack(unit.id)) {
            this.selectionSystem?.highlightAttackableTiles(unit);
          }
        }
      } else {
        if (oldTile) {
          oldTile.addUnit(selectedId);
        }
      }
      return;
    }

    this.selectionSystem?.deselectUnit();
    this.selectionSystem?.selectTile(tileKey, hexPos.q, hexPos.r);

    this.checkAndShowBuildPanel(hexPos.q, hexPos.r);
  }

  private checkAndShowBuildPanel(q: number, r: number): void {
    const tile = this.movementSystem?.getTileAt(q, r);
    if (!tile) {
      debug.building('[InputHandler] checkAndShowBuildPanel: tile not found');
      this.gameEventStore.setCanBuild(false);
      this.gameEventStore.setCanRecruit(false);
      return;
    }

    const currentPlayer = this.gameEventStore.currentPlayerId;
    if (!currentPlayer) {
      debug.building('[InputHandler] checkAndShowBuildPanel: no current player');
      this.gameEventStore.setCanBuild(false);
      this.gameEventStore.setCanRecruit(false);
      return;
    }

    const isOwnTile = tile.owner === currentPlayer;
    const hasBuilding = !!tile.building;
    const canAddBuilding = tile.canAddBuilding();
    const canAddArmy = tile.canAddArmy();

    debug.building('[InputHandler] checkAndShowBuildPanel:', {
      q, r,
      tileOwner: tile.owner,
      currentPlayer,
      isOwnTile,
      hasBuilding,
      buildingId: tile.building,
      canAddBuilding,
      canAddArmy,
      buildingCapacity: tile.capacity.building,
      buildingCount: tile.getBuildingCount()
    });

    const canBuild = isOwnTile && !hasBuilding && canAddBuilding;
    this.gameEventStore.setCanBuild(canBuild);

    if (canBuild) {
      this.gameEventStore.setBuildPanelPosition({ q, r });
    } else {
      this.gameEventStore.closeBuildPanel();
    }

    this.checkAndShowRecruitPanel(q, r, isOwnTile, hasBuilding, canAddArmy);
  }

  private checkAndShowRecruitPanel(q: number, r: number, isOwnTile: boolean, hasBuilding: boolean, canAddArmy: boolean): void {
    debug.building('[InputHandler] checkAndShowRecruitPanel called:', { q, r, isOwnTile, hasBuilding, canAddArmy });
    
    if (!isOwnTile || !hasBuilding || !canAddArmy) {
      debug.building('[InputHandler] checkAndShowRecruitPanel: conditions not met');
      this.gameEventStore.setCanRecruit(false);
      this.gameEventStore.closeRecruitPanel();
      return;
    }

    const buildingId = this.movementSystem?.getBuildingAt(q, r);
    debug.building('[InputHandler] checkAndShowRecruitPanel: buildingId =', buildingId);
    
    if (!buildingId) {
      debug.building('[InputHandler] checkAndShowRecruitPanel: no building at position');
      this.gameEventStore.setCanRecruit(false);
      this.gameEventStore.closeRecruitPanel();
      return;
    }

    const building = this.movementSystem?.getUnit(buildingId);
    if (!building) {
      this.gameEventStore.setCanRecruit(false);
      this.gameEventStore.closeRecruitPanel();
      return;
    }

    const buildingTraitId = building.traits[0];
    const trait = this.traitManager?.getTrait(buildingTraitId);
    const recruitTypes = trait?.recruitTypes;

    const canRecruit = !!recruitTypes && recruitTypes.length > 0;
    debug.building('[InputHandler] checkAndShowRecruitPanel:', {
      q, r,
      buildingId,
      buildingTraitId,
      recruitTypes,
      canRecruit
    });

    this.gameEventStore.setCanRecruit(canRecruit);

    if (canRecruit) {
      this.gameEventStore.setRecruitPanelPosition({ q, r });
    } else {
      this.gameEventStore.closeRecruitPanel();
    }
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

      const defenderQ = defender.q;
      const defenderR = defender.r;

      if (attacker.hp <= 0) {
        const attackerTile = this.movementSystem!.getTileAt(attacker.q, attacker.r);
        if (attackerTile) {
          attackerTile.removeUnit(attackerId);
        }
        this.movementSystem!.removeUnit(attackerId);
        const attackerNewTop = this.movementSystem!.getTopUnitAt(attacker.q, attacker.r);
        if (attackerNewTop && this.selectionSystem?.isCurrentPlayerUnit(attackerNewTop)) {
          this.selectionSystem.selectUnit(attackerNewTop);
        }
        debug.combat('Attacker died');
      }

      if (defender.hp <= 0) {
        const defenderTile = this.movementSystem!.getTileAt(defenderQ, defenderR);
        if (defenderTile) {
          defenderTile.removeUnit(defender.id);
        }
        this.movementSystem!.removeUnit(defender.id);
        const defenderNewTop = this.movementSystem!.getTopUnitAt(defenderQ, defenderR);
        if (defenderNewTop && this.selectionSystem?.isCurrentPlayerUnit(defenderNewTop)) {
          this.selectionSystem.selectUnit(defenderNewTop);
        }
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

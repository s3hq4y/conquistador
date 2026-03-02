import { GameSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { CombatSystem } from '../core/traits/CombatSystem';
import { TraitManager } from '../core/traits/TraitManager';
import type { UnitInstance } from '../core/map';
import { BuildingSystem } from '../core/systems/BuildingSystem';
import { TurnSystem, SelectionSystem, InputHandlerSystem, SceneLoader } from './systems';
import { useGameStore } from '../stores/game';
import { useGameEventStore } from '../stores/gameEvent';
import type { OwnerStates } from '../stores/game';

declare global {
  interface Window {
    __setOwnerStates?: (states: OwnerStates) => void;
    __endTurn?: () => void;
    __getBuildableItems?: (q: number, r: number) => any[];
    __build?: (traitId: string, q: number, r: number) => { success: boolean; error?: string };
    __getRecruitableItems?: (q: number, r: number) => any[];
    __recruit?: (unitTypeId: string, q: number, r: number) => { success: boolean; error?: string };
  }
}

export class GameModeSystem extends GameSystem {
  private turnSystem: TurnSystem | null = null;
  private selectionSystem: SelectionSystem | null = null;
  private inputHandlerSystem: InputHandlerSystem | null = null;
  private sceneLoader: SceneLoader | null = null;
  private traitManager: TraitManager | null = null;
  private combatSystem: CombatSystem | null = null;
  private buildingSystem: BuildingSystem | null = null;
  private gameStore = useGameStore();
  private gameEventStore = useGameEventStore();

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.turnSystem = new TurnSystem(this.engine);
    this.selectionSystem = new SelectionSystem(this.engine);
    this.inputHandlerSystem = new InputHandlerSystem(this.engine);
    this.sceneLoader = new SceneLoader(this.engine);

    await this.sceneLoader.initialize();

    this.traitManager = this.sceneLoader.getTraitManager();
    if (this.traitManager) {
      this.combatSystem = new CombatSystem(this.traitManager);
      this.turnSystem.setTraitManager(this.traitManager);
      this.buildingSystem = new BuildingSystem(this.engine);
      this.buildingSystem.setTraitManager(this.traitManager);
    }

    await this.turnSystem.initialize();
    await this.selectionSystem.initialize();
    await this.inputHandlerSystem.initialize();
    this.buildingSystem?.initialize();

    this.selectionSystem.setDependencies(
      () => this.getCurrentPlayerId(),
      (unit) => this.getUnitRange(unit),
      this.traitManager!
    );

    this.inputHandlerSystem.setDependencies(
      this.selectionSystem,
      this.traitManager!,
      this.combatSystem!
    );

    this.gameEventStore.setTileUnitCallbacks(
      (unitId: string) => {
        this.selectionSystem?.handleTileUnitSelected(unitId);
      },
      (newOrder: string[]) => {
        if (this.selectionSystem && newOrder.length > 0) {
          this.selectionSystem.setTopUnit(newOrder[0]);
        }
      }
    );

    window.__endTurn = () => this.endTurn();
    window.__getBuildableItems = (q: number, r: number) => {
      if (!this.buildingSystem) return [];
      return this.buildingSystem.getBuildableItems(q, r, this.getCurrentPlayerId());
    };
    window.__build = (traitId: string, q: number, r: number) => {
      if (!this.buildingSystem) return { success: false, error: 'BuildingSystem not initialized' };
      return this.buildingSystem.build(traitId, q, r, this.getCurrentPlayerId());
    };
    window.__getRecruitableItems = (q: number, r: number) => {
      if (!this.buildingSystem) return [];
      return this.buildingSystem.getRecruitableItems(q, r, this.getCurrentPlayerId());
    };
    window.__recruit = (unitTypeId: string, q: number, r: number) => {
      if (!this.buildingSystem) return { success: false, error: 'BuildingSystem not initialized' };
      return this.buildingSystem.recruitByUnitType(unitTypeId, q, r, this.getCurrentPlayerId());
    };

    await this.sceneLoader.loadDemoScene();
  }

  private getUnitRange(unit: UnitInstance): number {
    if (this.traitManager) {
      const stats = this.traitManager.calculateStats(unit.traits, this.calculateUnitStateValues(unit));
      return stats.range ?? 1;
    }
    return 1;
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

  endTurn(): void {
    this.turnSystem?.endTurn();
  }

  getCurrentTurn(): number {
    return this.turnSystem?.getCurrentTurn() ?? 1;
  }

  getCurrentPlayerId(): string {
    return this.turnSystem?.getCurrentPlayerId() ?? this.gameStore.getCurrentPlayerId();
  }

  getBuildingSystem(): BuildingSystem | null {
    return this.buildingSystem;
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.turnSystem?.dispose();
    this.selectionSystem?.dispose();
    this.inputHandlerSystem?.dispose();
    this.sceneLoader?.dispose();
    this.buildingSystem?.dispose();
    window.__endTurn = undefined;
    window.__getBuildableItems = undefined;
    window.__build = undefined;
    window.__getRecruitableItems = undefined;
    window.__recruit = undefined;
  }
}

import { GameSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { CombatSystem } from '../core/traits/CombatSystem';
import { TraitManager } from '../core/traits/TraitManager';
import type { UnitInstance } from '../core/map';
import { TurnSystem, SelectionSystem, InputHandlerSystem, SceneLoader } from './systems';
import { useGameStore } from '../stores/game';
import type { OwnerStates } from '../stores/game';

declare global {
  interface Window {
    __setOwnerStates?: (states: OwnerStates) => void;
    __endTurn?: () => void;
  }
}

export class GameModeSystem extends GameSystem {
  private turnSystem: TurnSystem | null = null;
  private selectionSystem: SelectionSystem | null = null;
  private inputHandlerSystem: InputHandlerSystem | null = null;
  private sceneLoader: SceneLoader | null = null;
  private traitManager: TraitManager | null = null;
  private combatSystem: CombatSystem | null = null;
  private gameStore = useGameStore();

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.turnSystem = new TurnSystem(this.engine);
    this.selectionSystem = new SelectionSystem(this.engine);
    this.inputHandlerSystem = new InputHandlerSystem(this.engine);
    this.sceneLoader = new SceneLoader(this.engine);

    await this.turnSystem.initialize();
    await this.selectionSystem.initialize();
    await this.inputHandlerSystem.initialize();
    await this.sceneLoader.initialize();

    this.traitManager = this.sceneLoader.getTraitManager();
    if (this.traitManager) {
      this.combatSystem = new CombatSystem(this.traitManager);
    }

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

    window.__endTurn = () => this.endTurn();

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

  update(_dt: number): void {
  }

  dispose(): void {
    this.turnSystem?.dispose();
    this.selectionSystem?.dispose();
    this.inputHandlerSystem?.dispose();
    this.sceneLoader?.dispose();
    window.__endTurn = undefined;
  }
}

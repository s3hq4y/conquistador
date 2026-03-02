import { GameSystem } from '../../core/systems';
import type { GameEngine } from '../../core/engine';
import { MovementSystem, UnitRenderSystem } from '../../core/systems';
import { TraitManager } from '../../core/traits';
import { useGameStore } from '../../stores/game';
import { useGameEventStore } from '../../stores/gameEvent';
import { debug } from '../../core/utils/debug';

export class TurnSystem extends GameSystem {
  private movementSystem: MovementSystem | null = null;
  private unitRenderSystem: UnitRenderSystem | null = null;
  private traitManager: TraitManager | null = null;
  private currentTurn: number = 1;
  private isAITurn: boolean = false;
  private gameStore = useGameStore();
  private gameEventStore = useGameEventStore();

  constructor(engine: GameEngine) {
    super(engine);
  }

  setTraitManager(traitManager: TraitManager): void {
    this.traitManager = traitManager;
  }

  async initialize(): Promise<void> {
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;
    this.unitRenderSystem = this.engine.getSystems().find(s => s instanceof UnitRenderSystem) as UnitRenderSystem;

    const currentPlayerId = this.gameStore.getCurrentPlayerId();
    this.gameEventStore.setCurrentPlayer(currentPlayerId);

    window.__endTurn = () => this.endTurn();
  }

  endTurn(): void {
    this.calculateIncome();
    this.gameStore.nextPlayer();

    const newPlayerIndex = this.gameStore.currentPlayerIndex;
    const completedRound = newPlayerIndex === 0;

    if (completedRound) {
      this.currentTurn++;
      debug.ui('Round completed, new turn:', this.currentTurn);
    }

    if (this.movementSystem) {
      this.movementSystem.resetAllMoves();
    }

    const currentPlayerId = this.getCurrentPlayerId();
    if (this.movementSystem && this.unitRenderSystem) {
      const playerUnits = this.movementSystem.getUnitsByOwner(currentPlayerId);
      for (const unit of playerUnits) {
        this.unitRenderSystem.restoreUnitColor(unit.id);
      }
    }

    this.gameEventStore.setTurn(this.currentTurn);
    this.gameEventStore.setCurrentPlayer(currentPlayerId);
    debug.ui('Turn ended. New turn:', this.currentTurn, 'Current player:', currentPlayerId);

    const currentPlayer = this.gameStore.currentPlayer;
    if (currentPlayer && this.isAIControlledPlayer(currentPlayer)) {
      this.triggerAITurn();
    }
  }

  private isAIControlledPlayer(player: { isAI: boolean; isLocal: boolean }): boolean {
    if (player.isAI) return true;
    return this.gameStore.isSingle && !player.isLocal;
  }

  private calculateIncome(): void {
    debug.ui('calculateIncome called');
    debug.ui('calculateIncome: movementSystem =', !!this.movementSystem, 'traitManager =', !!this.traitManager);
    if (!this.movementSystem || !this.traitManager) return;

    const currentPlayerId = this.getCurrentPlayerId();
    debug.ui('calculateIncome: currentPlayerId =', currentPlayerId);
    
    const allUnits = this.movementSystem.getUnitsByOwner(currentPlayerId);
    debug.ui('calculateIncome: units count =', allUnits.length);
    
    const incomeMap: Record<string, number> = {};

    for (const unit of allUnits) {
      const firstTrait = unit.traits?.[0];
      if (!firstTrait) continue;

      const trait = this.traitManager.getTrait(firstTrait);
      debug.ui('calculateIncome: unit', unit.id, 'trait', firstTrait, 'has production:', !!trait?.production);
      
      if (!trait || !trait.production) continue;

      for (const [resourceId, amount] of Object.entries(trait.production)) {
        if (typeof amount === 'number') {
          incomeMap[resourceId] = (incomeMap[resourceId] || 0) + amount;
        }
      }
    }

    for (const [resourceId, amount] of Object.entries(incomeMap)) {
      if (amount > 0) {
        this.gameStore.modifyResource(resourceId, amount, currentPlayerId);
        debug.ui(`Player ${currentPlayerId} gained ${amount} ${resourceId} from production`);
      }
    }
  }

  private triggerAITurn(): void {
    if (this.isAITurn) return;
    this.isAITurn = true;
    this.gameEventStore.setAITurn(true);

    debug.ui('AI turn started');

    setTimeout(() => {
      debug.ui('AI turn ended');
      this.isAITurn = false;
      this.gameEventStore.setAITurn(false);
      this.endTurn();
    }, 1000);
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  getCurrentPlayerId(): string {
    return this.gameStore.getCurrentPlayerId();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    window.__endTurn = undefined;
  }
}

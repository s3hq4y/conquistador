import { GameSystem } from '../../core/systems';
import type { GameEngine } from '../../core/engine';
import { MovementSystem, UnitRenderSystem } from '../../core/systems';
import { useGameStore } from '../../stores/game';
import { useGameEventStore } from '../../stores/gameEvent';
import { debug } from '../../core/utils/debug';

export class TurnSystem extends GameSystem {
  private movementSystem: MovementSystem | null = null;
  private unitRenderSystem: UnitRenderSystem | null = null;
  private currentTurn: number = 1;
  private isAITurn: boolean = false;
  private gameStore = useGameStore();
  private gameEventStore = useGameEventStore();

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;
    this.unitRenderSystem = this.engine.getSystems().find(s => s instanceof UnitRenderSystem) as UnitRenderSystem;

    window.__endTurn = () => this.endTurn();
  }

  endTurn(): void {
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

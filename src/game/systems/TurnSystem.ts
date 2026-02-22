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
    const isHotseat = this.gameStore.isHotseat;

    if (isHotseat) {
      this.gameStore.nextPlayer();
      debug.ui('Hotseat: switched to player:', this.gameStore.getCurrentPlayerId());
      this.gameEventStore.setCurrentPlayer(this.gameStore.getCurrentPlayerId());
    } else {
      this.currentTurn++;
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
    debug.ui('Turn ended. New turn:', this.currentTurn, 'Current player:', this.getCurrentPlayerId());
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

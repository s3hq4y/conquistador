import { GameSystem } from './GameSystem';
import { Player } from '../core/Player';
import type { GameEngine } from '../engine/GameEngine';

export class EconomySystem extends GameSystem {
  private players: Map<string, Player> = new Map();

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.addPlayer(new Player('Player', 'Player'));
    this.addPlayer(new Player('Enemy', 'Enemy'));
  }

  update(_dt: number): void {
    this.computeDeltas();
  }

  dispose(): void {
    this.players.clear();
  }

  private computeDeltas(): void {
    for (const player of this.players.values()) {
      player.resetDeltas();
      this.computePlayerDeltas(player);
    }
  }

  private computePlayerDeltas(player: Player): void {
    player.deltas.money += 10;
    player.deltas.food += 5;
    player.deltas.metal += 2;
    player.deltas.science += 1;
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }
}

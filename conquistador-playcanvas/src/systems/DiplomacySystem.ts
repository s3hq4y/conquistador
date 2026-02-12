import { GameSystem } from './GameSystem';
import type { GameEngine } from '../engine/GameEngine';

export class DiplomacySystem extends GameSystem {
  private relations: Map<string, Map<string, number>> = new Map();

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.initRelations();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.relations.clear();
  }

  private initRelations(): void {
    this.setRelation('Player', 'Enemy', -50);
    this.setRelation('Enemy', 'Player', -50);
  }

  setRelation(a: string, b: string, value: number): void {
    if (!this.relations.has(a)) {
      this.relations.set(a, new Map());
    }
    this.relations.get(a)!.set(b, value);
  }

  getRelation(a: string, b: string): number {
    return this.relations.get(a)?.get(b) ?? 0;
  }

  isAtWar(a: string, b: string): boolean {
    return this.getRelation(a, b) < -30;
  }
}

import { GameEngine } from '../engine';

export abstract class GameSystem {
  protected engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  abstract initialize(): void;
  abstract update(dt: number): void;
  abstract dispose(): void;
}

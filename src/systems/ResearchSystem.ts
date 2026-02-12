import { GameSystem } from './GameSystem';
import type { GameEngine } from '../engine/GameEngine';

export class ResearchSystem extends GameSystem {
  private researchedTechs: Map<string, Set<string>> = new Map();

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.initPlayerTech('Player');
    this.initPlayerTech('Enemy');
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.researchedTechs.clear();
  }

  private initPlayerTech(playerId: string): void {
    this.researchedTechs.set(playerId, new Set());
  }

  researchTech(playerId: string, techId: string): boolean {
    const playerTechs = this.researchedTechs.get(playerId);
    if (!playerTechs || playerTechs.has(techId)) {
      return false;
    }

    playerTechs.add(techId);
    return true;
  }

  hasTech(playerId: string, techId: string): boolean {
    return this.researchedTechs.get(playerId)?.has(techId) ?? false;
  }

  getResearchedTechs(playerId: string): string[] {
    return Array.from(this.researchedTechs.get(playerId) ?? []);
  }
}

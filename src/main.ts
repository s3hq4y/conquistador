import { setupGame } from './GameSetup';
import type { GameMode } from './stores/game';
import { debug } from './core/utils/debug';

export async function startGame(mode: GameMode): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    debug.game('Canvas element not found');
    return;
  }

  setupGame(canvas, mode);
}

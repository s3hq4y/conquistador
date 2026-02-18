import { setupGame } from './GameSetup';
import type { GameMode } from './stores/game';

export async function startGame(mode: GameMode): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  setupGame(canvas, mode);
}

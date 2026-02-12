import { GameEngine, MapSystem, CameraControlSystem } from './core';
import { EditorSystem } from './editor';
import { GameModeSystem } from './game';
import type { GameMode } from './stores/game';

export async function startGame(mode: GameMode): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const engine = new GameEngine(canvas);

  const mapSystem = new MapSystem(engine, 50);
  const cameraControlSystem = new CameraControlSystem(engine);
  const editorSystem = new EditorSystem(engine);
  const gameModeSystem = new GameModeSystem(engine);

  engine.addSystem(mapSystem);
  engine.addSystem(cameraControlSystem);
  
  if (mode === 'GAME') {
    engine.addSystem(gameModeSystem);
  } else {
    engine.addSystem(editorSystem);
  }

  engine.start();

  requestAnimationFrame(() => {
    if (mode === 'GAME') {
      editorSystem.hideUI();
    } else if (mode === 'RANDOM') {
      mapSystem.generateRandomMap();
      editorSystem.hideUI();
    } else if (mode === 'CUSTOM') {
      mapSystem.startCustomMap();
      editorSystem.showUI();
    }
  });

  console.log('Game started successfully (mode=', mode, ')');
}

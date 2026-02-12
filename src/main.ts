import { GameEngine, MapSystem, CameraControlSystem } from './core';
import { EditorSystem } from './editor';

export async function startGame(mode: 'RANDOM' | 'CUSTOM'): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const engine = new GameEngine(canvas);

  const mapSystem = new MapSystem(engine, 50);
  const cameraControlSystem = new CameraControlSystem(engine);
  const editorSystem = new EditorSystem(engine);

  engine.addSystem(mapSystem);
  engine.addSystem(cameraControlSystem);
  engine.addSystem(editorSystem);

  engine.start();

  requestAnimationFrame(() => {
    if (mode === 'RANDOM') {
      mapSystem.generateRandomMap();
      editorSystem.hideUI();
    } else {
      mapSystem.startCustomMap();
      editorSystem.showUI();
    }
  });

  console.log('Game started successfully (mode=', mode, ')');
}

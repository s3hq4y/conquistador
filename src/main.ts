import { GameEngine } from './engine';
import { MapSystem, EconomySystem, CombatSystem, DiplomacySystem, ResearchSystem, MovementSystem, CameraControlSystem, SelectionSystem } from './systems';
import { EditorSystem } from './systems/EditorSystem';

export async function startGame(mode: 'RANDOM' | 'CUSTOM'): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const engine = new GameEngine(canvas);

  const mapSystem = new MapSystem(engine, 50);
  const cameraControlSystem = new CameraControlSystem(engine);
  const selectionSystem = new SelectionSystem(engine);
  const economySystem = new EconomySystem(engine);
  const combatSystem = new CombatSystem(engine);
  const diplomacySystem = new DiplomacySystem(engine);
  const researchSystem = new ResearchSystem(engine);
  const movementSystem = new MovementSystem(engine);
  const editorSystem = new EditorSystem(engine);

  engine.addSystem(mapSystem);
  engine.addSystem(cameraControlSystem);
  engine.addSystem(selectionSystem);
  engine.addSystem(economySystem);
  engine.addSystem(combatSystem);
  engine.addSystem(diplomacySystem);
  engine.addSystem(researchSystem);
  engine.addSystem(movementSystem);
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

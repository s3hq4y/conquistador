import { GameEngine } from './engine';
import { MapSystem, EconomySystem, CombatSystem, DiplomacySystem, ResearchSystem, MovementSystem, CameraControlSystem, SelectionSystem } from './systems';

function main(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const engine = new GameEngine(canvas);

  const mapSystem = new MapSystem(engine, {
    radius: 10,
    hexSize: 50
  });
  const cameraControlSystem = new CameraControlSystem(engine);
  const selectionSystem = new SelectionSystem(engine);
  const economySystem = new EconomySystem(engine);
  const combatSystem = new CombatSystem(engine);
  const diplomacySystem = new DiplomacySystem(engine);
  const researchSystem = new ResearchSystem(engine);
  const movementSystem = new MovementSystem(engine);

  engine.addSystem(mapSystem);
  engine.addSystem(cameraControlSystem);
  engine.addSystem(selectionSystem);
  engine.addSystem(economySystem);
  engine.addSystem(combatSystem);
  engine.addSystem(diplomacySystem);
  engine.addSystem(researchSystem);
  engine.addSystem(movementSystem);

  engine.start();

  console.log('Game started successfully!');
}

window.addEventListener('DOMContentLoaded', main);

import { GameEngine, MapSystem, CameraControlSystem, MovementSystem, UnitRenderSystem, EdgeSystem } from './core';
import { EditorSystem } from './editor';
import { GameModeSystem } from './game';
import type { GameMode } from './stores/game';
import { debug } from './core/utils/debug';

export interface GameSetupResult {
  engine: GameEngine;
  mapSystem: MapSystem;
  cameraControlSystem: CameraControlSystem;
  movementSystem: MovementSystem;
  unitRenderSystem: UnitRenderSystem;
  edgeSystem: EdgeSystem;
  editorSystem: EditorSystem;
  gameModeSystem: GameModeSystem;
}

export function createGameEngine(canvas: HTMLCanvasElement): GameEngine {
  return new GameEngine(canvas);
}

export function createCoreSystems(engine: GameEngine, hexSize: number = 50): Omit<GameSetupResult, 'engine' | 'editorSystem' | 'gameModeSystem'> {
  const mapSystem = new MapSystem(engine, hexSize);
  const cameraControlSystem = new CameraControlSystem(engine);
  const movementSystem = new MovementSystem(engine);
  const unitRenderSystem = new UnitRenderSystem(engine);
  const edgeSystem = new EdgeSystem(engine);

  return {
    mapSystem,
    cameraControlSystem,
    movementSystem,
    unitRenderSystem,
    edgeSystem
  };
}

export function registerCoreSystems(engine: GameEngine, systems: ReturnType<typeof createCoreSystems>): void {
  engine.addSystem(systems.mapSystem);
  engine.addSystem(systems.cameraControlSystem);
  engine.addSystem(systems.movementSystem);
  engine.addSystem(systems.unitRenderSystem);
  engine.addSystem(systems.edgeSystem);
}

export function setupEdgeSystemDependencies(edgeSystem: EdgeSystem, mapSystem: MapSystem): void {
  edgeSystem.setMapSystem(mapSystem);
}

export function createModeSystems(engine: GameEngine): { editorSystem: EditorSystem; gameModeSystem: GameModeSystem } {
  return {
    editorSystem: new EditorSystem(engine),
    gameModeSystem: new GameModeSystem(engine)
  };
}

export function setupGame(canvas: HTMLCanvasElement, mode: GameMode): GameSetupResult {
  const engine = createGameEngine(canvas);
  const coreSystems = createCoreSystems(engine);
  const modeSystems = createModeSystems(engine);

  registerCoreSystems(engine, coreSystems);

  if (mode === 'GAME') {
    engine.addSystem(modeSystems.gameModeSystem);
  } else {
    engine.addSystem(modeSystems.editorSystem);
  }

  engine.start();

  setupEdgeSystemDependencies(coreSystems.edgeSystem, coreSystems.mapSystem);

  requestAnimationFrame(() => {
    if (mode === 'GAME') {
      modeSystems.editorSystem.hideUI();
    } else if (mode === 'RANDOM') {
      coreSystems.mapSystem.generateRandomMap();
      modeSystems.editorSystem.hideUI();
    } else if (mode === 'CUSTOM') {
      coreSystems.mapSystem.startCustomMap();
      modeSystems.editorSystem.showUI();
    }
  });

  debug.game('Game started successfully (mode=', mode, ')');

  return {
    engine,
    ...coreSystems,
    ...modeSystems
  };
}

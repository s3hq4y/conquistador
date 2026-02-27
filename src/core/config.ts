export interface DebugConfig {
  editor: {
    edgeSystem: boolean;
    sceneManager: boolean;
    sceneApi: boolean;
    editorTools: boolean;
    editorUI: boolean;
    edgeEditor: boolean;
    inputHandler: boolean;
  };
  game: {
    combat: boolean;
    movement: boolean;
    selection: boolean;
    ui: boolean;
    render: boolean;
    scene: boolean;
    texture: boolean;
    compass: boolean;
    directionArrows: boolean;
    coloredBorder: boolean;
  };
  beta: {
    pathfinding: boolean;
    movementRange: boolean;
    terrainViewer: boolean;
  };
}

export const SCENE_BASE_PATH = '/game_saves';

const DEBUG_SETTINGS: DebugConfig = {
  editor: {
    edgeSystem: false,
    sceneManager: false,
    sceneApi: false,
    editorTools: false,
    editorUI: false,
    edgeEditor: false,
    inputHandler: false
  },
  game: {
    combat: false,
    movement: false,
    selection: false,
    ui: true,
    render: false,
    scene: false,
    texture: false,
    compass: false,
    directionArrows: false,
    coloredBorder: false
  },
  beta: {
    pathfinding: false,
    movementRange: false,
    terrainViewer: false
  }
};

export const debugConfig: DebugConfig = DEBUG_SETTINGS;

export function setEditorDebug(enabled: boolean): void {
  debugConfig.editor.edgeSystem = enabled;
  debugConfig.editor.sceneManager = enabled;
  debugConfig.editor.sceneApi = enabled;
  debugConfig.editor.editorTools = enabled;
  debugConfig.editor.editorUI = enabled;
  debugConfig.editor.edgeEditor = enabled;
  debugConfig.editor.inputHandler = enabled;
}

export function setGameDebug(enabled: boolean): void {
  debugConfig.game.combat = enabled;
  debugConfig.game.movement = enabled;
  debugConfig.game.selection = enabled;
  debugConfig.game.ui = enabled;
  debugConfig.game.render = enabled;
  debugConfig.game.scene = enabled;
  debugConfig.game.texture = enabled;
  debugConfig.game.compass = enabled;
  debugConfig.game.directionArrows = enabled;
  debugConfig.game.coloredBorder = enabled;
}

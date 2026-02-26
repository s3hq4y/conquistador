export interface DebugConfig {
  editor: {
    edgeSystem: boolean;
    sceneManager: boolean;
    sceneApi: boolean;
    editorTools: boolean;
    editorUI: boolean;
  };
  game: {
    combat: boolean;
    movement: boolean;
    selection: boolean;
    ui: boolean;
    compass: boolean;
    directionArrows: boolean;
    coloredBorder: boolean;
  };
}

function getDebugFromUrl(): Partial<DebugConfig['editor'] & DebugConfig['game']> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const debug = params.get('debug');
  
  if (debug) {
    const modules = debug.split(',');
    return {
      edgeSystem: modules.includes('edge') || modules.includes('all'),
      sceneManager: modules.includes('scene') || modules.includes('all'),
      sceneApi: modules.includes('api') || modules.includes('all'),
      editorTools: modules.includes('tools') || modules.includes('all'),
      editorUI: modules.includes('ui') || modules.includes('all'),
      combat: modules.includes('combat') || modules.includes('all'),
      movement: modules.includes('movement') || modules.includes('all'),
      selection: modules.includes('selection') || modules.includes('all'),
      ui: modules.includes('ui') || modules.includes('all'),
      compass: modules.includes('compass') || modules.includes('all'),
      directionArrows: modules.includes('directionArrows') || modules.includes('all'),
      coloredBorder: modules.includes('coloredBorder') || modules.includes('all')
    };
  }
  
  return {};
}

const urlDebug = getDebugFromUrl();

export const debugConfig: DebugConfig = {
  editor: {
    edgeSystem: urlDebug.edgeSystem ?? false,
    sceneManager: urlDebug.sceneManager ?? false,
    sceneApi: urlDebug.sceneApi ?? false,
    editorTools: urlDebug.editorTools ?? false,
    editorUI: urlDebug.editorUI ?? false
  },
  game: {
    combat: urlDebug.combat ?? false,
    movement: urlDebug.movement ?? false,
    selection: urlDebug.selection ?? false,
    ui: urlDebug.ui ?? false,
    compass: urlDebug.compass ?? false,
    directionArrows: urlDebug.directionArrows ?? false,
    coloredBorder: urlDebug.coloredBorder ?? false
  }
};

export function setEditorDebug(enabled: boolean): void {
  debugConfig.editor.edgeSystem = enabled;
  debugConfig.editor.sceneManager = enabled;
  debugConfig.editor.sceneApi = enabled;
  debugConfig.editor.editorTools = enabled;
  debugConfig.editor.editorUI = enabled;
}

export function setGameDebug(enabled: boolean): void {
  debugConfig.game.combat = enabled;
  debugConfig.game.movement = enabled;
  debugConfig.game.selection = enabled;
  debugConfig.game.ui = enabled;
  debugConfig.game.compass = enabled;
  debugConfig.game.directionArrows = enabled;
  debugConfig.game.coloredBorder = enabled;
}

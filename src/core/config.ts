export interface DebugConfig {
  editor: {
    edgeSystem: boolean;
    sceneManager: boolean;
    sceneApi: boolean;
    editorTools: boolean;
    editorUI: boolean;
  };
}

function getDebugFromUrl(): Partial<DebugConfig['editor']> {
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
      editorUI: modules.includes('ui') || modules.includes('all')
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
  }
};

export function setEditorDebug(enabled: boolean): void {
  debugConfig.editor.edgeSystem = enabled;
  debugConfig.editor.sceneManager = enabled;
  debugConfig.editor.sceneApi = enabled;
  debugConfig.editor.editorTools = enabled;
  debugConfig.editor.editorUI = enabled;
}

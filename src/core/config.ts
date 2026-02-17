export interface DebugConfig {
  editor: {
    edgeSystem: boolean;
    sceneManager: boolean;
    sceneApi: boolean;
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
      sceneApi: modules.includes('api') || modules.includes('all')
    };
  }
  
  return {};
}

const urlDebug = getDebugFromUrl();

export const debugConfig: DebugConfig = {
  editor: {
    edgeSystem: urlDebug.edgeSystem ?? false,
    sceneManager: urlDebug.sceneManager ?? false,
    sceneApi: urlDebug.sceneApi ?? false
  }
};

export function setEditorDebug(enabled: boolean): void {
  debugConfig.editor.edgeSystem = enabled;
  debugConfig.editor.sceneManager = enabled;
  debugConfig.editor.sceneApi = enabled;
}

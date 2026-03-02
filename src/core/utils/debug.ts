import { debugConfig } from '../config'

type GameModule = 'combat' | 'movement' | 'selection' | 'ui' | 'render' | 'scene' | 'texture' | 'building'
type EditorModule = 'edgeSystem' | 'sceneManager' | 'sceneApi' | 'editorTools' | 'editorUI' | 'edgeEditor' | 'inputHandler'
type BetaModule = 'pathfinding' | 'movementRange' | 'terrainViewer'
type DebugModule = GameModule | EditorModule | BetaModule

function isEnabled(category: 'game' | 'editor' | 'beta', module: string): boolean {
  return (debugConfig as any)[category]?.[module] ?? false
}

export function debugConsole(module: DebugModule, message: string, ...args: unknown[]): void {
  let category: 'game' | 'editor' | 'beta' = 'game'
  
  if (['combat', 'movement', 'selection', 'ui', 'render', 'scene', 'texture', 'building'].includes(module)) {
    category = 'game'
  } else if (['edgeSystem', 'sceneManager', 'sceneApi', 'editorTools', 'editorUI', 'edgeEditor', 'inputHandler'].includes(module)) {
    category = 'editor'
  } else if (['pathfinding', 'movementRange', 'terrainViewer'].includes(module)) {
    category = 'beta'
  }
  
  if (isEnabled(category, module)) {
    console.log(`[${module}]`, message, ...args)
  }
}

export const debug = {
  game: (message: string, ...args: unknown[]) => debugConsole('combat', message, ...args),
  combat: (message: string, ...args: unknown[]) => debugConsole('combat', message, ...args),
  movement: (message: string, ...args: unknown[]) => debugConsole('movement', message, ...args),
  selection: (message: string, ...args: unknown[]) => debugConsole('selection', message, ...args),
  ui: (message: string, ...args: unknown[]) => debugConsole('ui', message, ...args),
  render: (message: string, ...args: unknown[]) => debugConsole('render', message, ...args),
  scene: (message: string, ...args: unknown[]) => debugConsole('scene', message, ...args),
  texture: (message: string, ...args: unknown[]) => debugConsole('texture', message, ...args),
  building: (message: string, ...args: unknown[]) => debugConsole('building', message, ...args),
  editor: (module: EditorModule, message: string, ...args: unknown[]) => debugConsole(module, message, ...args),
  beta: (module: BetaModule, message: string, ...args: unknown[]) => debugConsole(module, message, ...args)
}

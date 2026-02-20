import { debugConfig } from '../config'

type GameModule = 'combat' | 'movement' | 'selection' | 'ui'
type EditorModule = 'edgeSystem' | 'sceneManager' | 'sceneApi' | 'editorTools' | 'editorUI'
type DebugModule = GameModule | EditorModule

function isEnabled(category: 'game' | 'editor', module: string): boolean {
  return (debugConfig as any)[category]?.[module] ?? false
}

export function debugConsole(module: DebugModule, message: string, ...args: unknown[]): void {
  const category: 'game' | 'editor' = 
    (['combat', 'movement', 'selection', 'ui'].includes(module)) ? 'game' : 'editor'
  
  if (isEnabled(category, module)) {
    console.log(`[${module}]`, message, ...args)
  }
}

export const debug = {
  combat: (message: string, ...args: unknown[]) => debugConsole('combat', message, ...args),
  movement: (message: string, ...args: unknown[]) => debugConsole('movement', message, ...args),
  selection: (message: string, ...args: unknown[]) => debugConsole('selection', message, ...args),
  ui: (message: string, ...args: unknown[]) => debugConsole('ui', message, ...args),
  editor: (module: EditorModule, message: string, ...args: unknown[]) => debugConsole(module, message, ...args)
}

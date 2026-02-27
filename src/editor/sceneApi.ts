export interface SceneListItem {
  id: string;
  name: string;
  description: string;
  author: string;
  modifiedAt: string;
}

export interface LocalizedString {
  en: string;
  zh: string;
  [lang: string]: string;
}

import { debugConfig } from '../core/config';
import { SCENE_BASE_PATH } from '../core/config';
import type { EdgeTypeInstance } from '../core/map';

export type IconType = 'emoji' | 'svg' | 'image';

export interface IconDefinition {
  type: IconType;
  value?: string;
  path?: string;
}

export type Icon = string | IconDefinition;

export interface TerrainComponents {
  name: LocalizedString;
  description: LocalizedString;
  color: string;
  icon: Icon;
  isWater?: boolean;
  isPassable?: boolean;
  movementCost?: number;
}

export interface TerrainTypeInstance {
  components: TerrainComponents;
}

export interface OwnerComponents {
  name: LocalizedString;
  description: LocalizedString;
  color: string;
  icon: Icon;
  isPlayer?: boolean;
  isAI?: boolean;
}

export interface OwnerTagInstance {
  components: OwnerComponents;
}

export interface TileComponents {
  terrain: string;
  owner: string;
  building: string | null;
  district: string | null;
  deposit: string | null;
}

export interface TileInstance {
  pos: [number, number];
  components: TileComponents;
}

export interface EdgeInstance {
  tiles: [[number, number], [number, number]];
  type: string;
  properties?: Record<string, unknown>;
}

export interface UnitInstance {
  id: string;
  q: number;
  r: number;
  owner: string;
  traits: string[];
  hp: number;
}

export interface TerrainGroups {
  land: string[];
  sea: string[];
  air: string[];
}

export interface SceneData {
  version: string;
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  settings: {
    hexSize: number;
    defaultTerrain: string;
    defaultOwner: string;
  };
  terrainTypes: Record<string, TerrainTypeInstance>;
  ownerTags: Record<string, OwnerTagInstance>;
  tiles: TileInstance[];
  edges?: EdgeInstance[];
  edgeTypes?: Record<string, EdgeTypeInstance>;
  terrainGroups?: TerrainGroups;
  units?: UnitInstance[];
}

export async function listScenes(): Promise<SceneListItem[]> {
  try {
    const resp = await fetch('/api/scenes');
    const data = await resp.json();
    if (data.success && data.scenes) {
      return data.scenes;
    }
  } catch (e) {
    console.warn('Failed to fetch scenes from API, falling back to static files');
  }
  
  const modules = import.meta.glob('/game_saves/*/manifest.json', { as: 'json' }) as Record<string, () => Promise<any>>;
  const scenes: SceneListItem[] = [];
  for (const p of Object.keys(modules)) {
    try {
      const loader = modules[p];
      const manifest = await loader();
      const m = p.match(new RegExp(`${SCENE_BASE_PATH}/([^/]+)/manifest.json$`));
      const id = m ? m[1] : p;
      scenes.push({
        id,
        name: manifest.name || id,
        description: manifest.description || '',
        author: manifest.author || 'Unknown',
        modifiedAt: manifest.modifiedAt || manifest.createdAt || new Date().toISOString()
      });
    } catch (e) {
      // ignore individual manifest load errors
    }
  }
  
  return scenes;
}

export async function loadScene(id: string): Promise<SceneData> {
  try {
    const resp = await fetch(`/api/scenes/${id}`);
    const data = await resp.json();
    if (data.success && data.scene) {
      return data.scene as SceneData;
    }
  } catch (e) {
    console.warn('Failed to load scene from API, falling back to static files');
  }
  
  const base = `${SCENE_BASE_PATH}/${id}`;
  const timestamp = Date.now();
  
  const edgesPromise = fetch(`${base}/edges.json?t=${timestamp}`).then(r => { 
    if (!r.ok) return undefined; 
    return r.json(); 
  }).catch(() => undefined);
  
  const edgeTypesPromise = fetch(`${base}/edge_types.json?t=${timestamp}`).then(r => {
    if (!r.ok) return undefined;
    return r.json();
  }).catch(() => undefined);
  
  const unitsPromise = fetch(`${base}/units.json?t=${timestamp}`).then(r => { 
    if (!r.ok) return undefined; 
    return r.json(); 
  }).catch(() => undefined);
  
  const terrainGroupsPromise = fetch(`${base}/terrain_groups.json?t=${timestamp}`).then(r => { 
    if (!r.ok) return undefined; 
    return r.json(); 
  }).catch(() => undefined);
  
  const [manifest, terrainTypes, ownerTags, tiles, edges, edgeTypes, units, terrainGroups] = await Promise.all([
    fetch(`${base}/manifest.json`).then(r => { if (!r.ok) throw new Error('manifest not found'); return r.json(); }),
    fetch(`${base}/terrain_types.json`).then(r => { if (!r.ok) throw new Error('terrain_types not found'); return r.json(); }),
    fetch(`${base}/owner_tags.json`).then(r => { if (!r.ok) throw new Error('owner_tags not found'); return r.json(); }),
    fetch(`${base}/tiles.json`).then(r => { if (!r.ok) throw new Error('tiles not found'); return r.json(); }),
    edgesPromise,
    edgeTypesPromise,
    unitsPromise,
    terrainGroupsPromise
  ]);

  if (debugConfig.editor.sceneApi) {
    console.log('[sceneApi] After Promise.all, edges type:', typeof edges, 'value:', edges);
    console.log('[sceneApi] Is array:', Array.isArray(edges), 'Length:', edges?.length);
    console.log('[sceneApi] edgeTypes:', edgeTypes);
    console.log('[sceneApi] units:', units);
    console.log('[sceneApi] terrainGroups:', terrainGroups);
  }

  const sceneData: SceneData = {
    version: manifest.version,
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    author: manifest.author,
    createdAt: manifest.createdAt,
    modifiedAt: manifest.modifiedAt,
    settings: manifest.settings,
    terrainTypes: terrainTypes as Record<string, TerrainTypeInstance>,
    ownerTags: ownerTags as Record<string, OwnerTagInstance>,
    tiles: tiles as TileInstance[],
    edges: edges as EdgeInstance[] | undefined,
    edgeTypes: edgeTypes as Record<string, EdgeTypeInstance> | undefined,
    units: units as UnitInstance[] | undefined,
    terrainGroups: terrainGroups as TerrainGroups | undefined
  };

  return sceneData;
}

export async function saveScene(scene: SceneData): Promise<string> {
  const resp = await fetch('/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  });
  const data = await resp.json();
  if (data && data.success) {
    return data.sceneId;
  }
  throw new Error(data.error || 'Failed to save scene');
}

export async function updateScene(id: string, scene: Partial<SceneData>): Promise<void> {
  const resp = await fetch(`/api/scenes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  });
  const data = await resp.json();
  if (data && data.success) {
    return;
  }
  throw new Error(data.error || 'Failed to update scene');
}

export async function deleteScene(id: string): Promise<void> {
  const resp = await fetch(`/api/scenes/${id}`, { method: 'DELETE' });
  const data = await resp.json();
  if (data && data.success) {
    return;
  }
  throw new Error(data.error || 'Failed to delete scene');
}

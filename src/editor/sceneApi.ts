const API_BASE = 'http://localhost:3003/api';

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

export interface TerrainComponents {
  name: LocalizedString;
  description: LocalizedString;
  color: string;
  icon: string;
  isWater?: boolean;
  isPassable?: boolean;
  movementCost?: number;
}

export interface TerrainTypeInstance {
  components: TerrainComponents;
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
  ownerTags: any[];
  tiles: TileInstance[];
}

export async function listScenes(): Promise<SceneListItem[]> {
  const response = await fetch(`${API_BASE}/scenes`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.scenes;
}

export async function loadScene(id: string): Promise<SceneData> {
  const response = await fetch(`${API_BASE}/scenes/${id}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.scene;
}

export async function saveScene(scene: SceneData): Promise<string> {
  const response = await fetch(`${API_BASE}/scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.sceneId;
}

export async function updateScene(id: string, scene: Partial<SceneData>): Promise<void> {
  const response = await fetch(`${API_BASE}/scenes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
}

export async function deleteScene(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/scenes/${id}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
}

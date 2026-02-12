import { GameSystem } from './GameSystem';
import { HexGrid } from '../core/HexGrid';
import { Tile } from '../core/Tile';
import type { GameEngine } from '../engine/GameEngine';
import { HexTile } from '../components/HexTile';
import { 
  SceneData, 
  TerrainTypeDefinition, 
  OwnerTagDefinition, 
  createEmptyScene,
  DEFAULT_TERRAIN_TYPES,
  DEFAULT_OWNER_TAGS
} from '../core/SceneData';

type MapMode = 'NONE' | 'RANDOM' | 'CUSTOM';

export class MapSystem extends GameSystem {
  private grid: HexGrid;
  private hexSize: number;
  private tileEntities: Map<string, HexTile> = new Map();
  private mode: MapMode = 'NONE';
  private sceneData: SceneData;
  private terrainTypes: Map<string, TerrainTypeDefinition> = new Map();
  private ownerTags: Map<string, OwnerTagDefinition> = new Map();

  constructor(engine: GameEngine, hexSize: number = 50) {
    super(engine);
    this.hexSize = hexSize;
    this.grid = new HexGrid(10, hexSize);
    this.sceneData = createEmptyScene();
    this.initDefaultDefinitions();
  }

  private initDefaultDefinitions(): void {
    DEFAULT_TERRAIN_TYPES.forEach(t => this.terrainTypes.set(t.id, t));
    DEFAULT_OWNER_TAGS.forEach(o => this.ownerTags.set(o.id, o));
  }

  initialize(): void {
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.tileEntities.forEach(hexTile => hexTile.destroy());
    this.tileEntities.clear();
  }

  getTerrainDef(id: string): TerrainTypeDefinition {
    return this.terrainTypes.get(id) || this.terrainTypes.get('plains')!;
  }

  getOwnerDef(id: string): OwnerTagDefinition {
    return this.ownerTags.get(id) || this.ownerTags.get('neutral')!;
  }

  getAllTerrainTypes(): TerrainTypeDefinition[] {
    return Array.from(this.terrainTypes.values());
  }

  getAllOwnerTags(): OwnerTagDefinition[] {
    return Array.from(this.ownerTags.values());
  }

  addTerrainType(def: TerrainTypeDefinition): void {
    this.terrainTypes.set(def.id, def);
    this.sceneData.terrainTypes.push(def);
  }

  addOwnerTag(def: OwnerTagDefinition): void {
    this.ownerTags.set(def.id, def);
    this.sceneData.ownerTags.push(def);
  }

  updateTerrainType(def: TerrainTypeDefinition): void {
    this.terrainTypes.set(def.id, def);
    const idx = this.sceneData.terrainTypes.findIndex(t => t.id === def.id);
    if (idx >= 0) {
      this.sceneData.terrainTypes[idx] = def;
    }
  }

  updateOwnerTag(def: OwnerTagDefinition): void {
    this.ownerTags.set(def.id, def);
    const idx = this.sceneData.ownerTags.findIndex(o => o.id === def.id);
    if (idx >= 0) {
      this.sceneData.ownerTags[idx] = def;
    }
  }

  private createTileEntity(tile: Tile): void {
    const app = this.engine.getApplication();
    const renderer = this.engine.getRenderer();
    const tileLayer = renderer.getTileLayer();

    const terrainDef = this.getTerrainDef(tile.terrainId);
    const ownerDef = this.getOwnerDef(tile.ownerId);

    const hexTile = new HexTile(app, tile, this.hexSize, terrainDef, ownerDef);
    const pos = this.grid.hexToPixel(tile.q, tile.r);
    hexTile.setPosition(pos.x, pos.y);
    tileLayer.addChild(hexTile.getEntity());
    this.tileEntities.set(tile.getKey(), hexTile);
  }

  generateRandomMap(): void {
    this.mode = 'RANDOM';
    this.clearMap();

    this.grid.generate();
    const tiles = this.grid.getTiles();
    const terrainList = this.getAllTerrainTypes();
    
    for (const tile of tiles) {
      const randomTerrain = terrainList[Math.floor(Math.random() * terrainList.length)];
      tile.terrainId = randomTerrain.id;
      tile.ownerId = tile.q < -3 ? 'enemy' : (tile.q > 3 ? 'neutral' : 'player');
      this.createTileEntity(tile);
    }
  }

  startCustomMap(): void {
    this.mode = 'CUSTOM';
    this.clearMap();

    const center = new Tile(0, 0);
    center.terrainId = this.sceneData.settings.defaultTerrain;
    center.ownerId = this.sceneData.settings.defaultOwner;
    this.grid.addTile(center);
    this.createTileEntity(center);
  }

  clearMap(): void {
    const renderer = this.engine.getRenderer();
    renderer.clear();
    this.tileEntities.forEach(hexTile => hexTile.destroy());
    this.tileEntities.clear();
    this.grid.clear();
  }

  isCustomMode(): boolean {
    return this.mode === 'CUSTOM';
  }

  getMode(): MapMode {
    return this.mode;
  }

  addTileAt(q: number, r: number): Tile | undefined {
    if (this.grid.getTile(q, r)) return undefined;

    const tile = new Tile(q, r);
    tile.terrainId = this.sceneData.settings.defaultTerrain;
    tile.ownerId = this.sceneData.settings.defaultOwner;
    this.grid.addTile(tile);
    this.createTileEntity(tile);

    return tile;
  }

  removeTileAt(q: number, r: number): boolean {
    const key = `${q},${r}`;
    const hexTile = this.tileEntities.get(key);
    if (hexTile) {
      hexTile.destroy();
      this.tileEntities.delete(key);
      this.grid.removeTile(q, r);
      return true;
    }
    return false;
  }

  getGrid(): HexGrid {
    return this.grid;
  }

  getTileEntities(): Map<string, HexTile> {
    return this.tileEntities;
  }

  getHexSize(): number {
    return this.hexSize;
  }

  getSceneData(): SceneData {
    this.sceneData.tiles = this.grid.getTiles().map(t => t.toJSON());
    this.sceneData.modifiedAt = new Date().toISOString();
    return { ...this.sceneData };
  }

  loadSceneData(data: SceneData): boolean {
    try {
      this.sceneData = data;
      this.terrainTypes.clear();
      this.ownerTags.clear();
      
      data.terrainTypes.forEach(t => this.terrainTypes.set(t.id, t));
      data.ownerTags.forEach(o => this.ownerTags.set(o.id, o));
      
      this.hexSize = data.settings.hexSize;
      this.grid = new HexGrid(10, this.hexSize);
      
      this.clearMap();
      
      for (const tileData of data.tiles) {
        const tile = Tile.fromJSON(tileData);
        this.grid.addTile(tile);
        this.createTileEntity(tile);
      }

      return true;
    } catch (error) {
      console.error('Failed to load scene:', error);
      return false;
    }
  }

  setSceneName(name: string): void {
    this.sceneData.name = name;
  }

  setSceneDescription(description: string): void {
    this.sceneData.description = description;
  }
}

import { GameSystem } from './GameSystem';
import { HexGrid, Tile, LegacySceneData, TerrainTypeDefinition, OwnerTagDefinition, createEmptyScene, DEFAULT_TERRAIN_TYPES } from '../map';
import type { GameEngine } from '../engine';
import { HexTile } from '../../components/HexTile';

type MapMode = 'NONE' | 'RANDOM' | 'CUSTOM';

export class MapSystem extends GameSystem {
  private grid: HexGrid;
  private hexSize: number;
  private tileEntities: Map<string, HexTile> = new Map();
  private mode: MapMode = 'NONE';
  private sceneData: LegacySceneData;
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
    DEFAULT_TERRAIN_TYPES.forEach((t: TerrainTypeDefinition) => this.terrainTypes.set(t.id, t));
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
    const idx = this.sceneData.terrainTypes.findIndex((t: TerrainTypeDefinition) => t.id === def.id);
    if (idx >= 0) {
      this.sceneData.terrainTypes[idx] = def;
    }
  }

  updateOwnerTag(def: OwnerTagDefinition): void {
    this.ownerTags.set(def.id, def);
    const idx = this.sceneData.ownerTags.findIndex((o: OwnerTagDefinition) => o.id === def.id);
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

    this.updateAllBorderStates();
  }

  startCustomMap(): void {
    this.mode = 'CUSTOM';
    this.clearMap();

    const center = new Tile(0, 0);
    center.terrainId = this.sceneData.settings.defaultTerrain;
    center.ownerId = this.sceneData.settings.defaultOwner;
    this.grid.addTile(center);
    this.createTileEntity(center);

    this.updateAllBorderStates();
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

    this.updateAllBorderStates();
    return tile;
  }

  removeTileAt(q: number, r: number): boolean {
    const key = `${q},${r}`;
    const hexTile = this.tileEntities.get(key);
    if (hexTile) {
      hexTile.destroy();
      this.tileEntities.delete(key);
      this.grid.removeTile(q, r);
      this.updateAllBorderStates();
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

  getSceneData(): LegacySceneData {
    this.sceneData.tiles = this.grid.getTiles().map(t => t.toJSON());
    this.sceneData.modifiedAt = new Date().toISOString();
    return { ...this.sceneData };
  }

  loadSceneData(data: LegacySceneData): boolean {
    try {
      this.sceneData = data;
      this.terrainTypes.clear();
      this.ownerTags.clear();
      
      data.terrainTypes.forEach((t: TerrainTypeDefinition) => this.terrainTypes.set(t.id, t));
      data.ownerTags.forEach((o: OwnerTagDefinition) => this.ownerTags.set(o.id, o));
      
      this.hexSize = data.settings.hexSize;
      this.grid = new HexGrid(10, this.hexSize);
      
      this.clearMap();
      
      for (const tileData of data.tiles) {
        const tile = Tile.fromJSON(tileData);
        this.grid.addTile(tile);
        this.createTileEntity(tile);
      }

      this.updateAllBorderStates();
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

  updateTileOwner(q: number, r: number, ownerId: string): void {
    const tile = this.grid.getTile(q, r);
    const hexTile = this.tileEntities.get(`${q},${r}`);
    
    if (tile && hexTile) {
      tile.ownerId = ownerId;
      const ownerDef = this.getOwnerDef(ownerId);
      hexTile.setOwner(ownerDef);
      this.updateAllBorderStates();
    }
  }

  updateAllBorderStates(): void {
    const ownerRegions = this.findOwnerRegions();
    
    for (const hexTile of this.tileEntities.values()) {
      const tile = hexTile.getTile();
      const key = tile.getKey();
      const region = ownerRegions.get(tile.ownerId);
      
      if (!region) {
        hexTile.setBorderState(false, 0, []);
        continue;
      }

      const isBorder = region.borderTiles.has(key);
      let distanceFromBorder = 0;

      if (!isBorder && region.tileDistances.has(key)) {
        distanceFromBorder = region.tileDistances.get(key)!;
      }

      const borderEdges = this.calculateBorderEdges(tile);
      hexTile.setBorderState(isBorder, distanceFromBorder, borderEdges);
    }
  }

  private calculateBorderEdges(tile: Tile): number[] {
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];
    
    const directionToEdge: { [key: number]: number } = {
      0: 1,
      1: 0,
      2: 5,
      3: 4,
      4: 3,
      5: 2
    };
    
    const borderEdges: number[] = [];
    
    for (let i = 0; i < 6; i++) {
      const [dq, dr] = directions[i];
      const neighbor = this.grid.getTile(tile.q + dq, tile.r + dr);
      
      if (!neighbor || neighbor.ownerId !== tile.ownerId) {
        borderEdges.push(directionToEdge[i]);
      }
    }
    
    return borderEdges;
  }

  private findOwnerRegions(): Map<string, { 
    borderTiles: Set<string>, 
    tileDistances: Map<string, number>,
    borderEdges: Map<string, number[]>
  }> {
    const regions = new Map<string, { 
      borderTiles: Set<string>, 
      tileDistances: Map<string, number>,
      borderEdges: Map<string, number[]>
    }>();

    const tiles = this.grid.getTiles();
    const ownerGroups = new Map<string, Set<string>>();

    for (const tile of tiles) {
      if (!ownerGroups.has(tile.ownerId)) {
        ownerGroups.set(tile.ownerId, new Set());
      }
      ownerGroups.get(tile.ownerId)!.add(tile.getKey());
    }

    for (const [ownerId, tileKeys] of ownerGroups) {
      const borderTiles = new Set<string>();
      const tileDistances = new Map<string, number>();
      const borderEdgesMap = new Map<string, number[]>();

      for (const key of tileKeys) {
        const { q, r } = Tile.fromKey(key);
        const edges = this.calculateBorderEdgesForOwner(q, r, ownerId, tileKeys);
        
        if (edges.length > 0) {
          borderTiles.add(key);
          tileDistances.set(key, 0);
          borderEdgesMap.set(key, edges);
        }
      }

      const visited = new Set<string>(borderTiles);
      let currentWave = Array.from(borderTiles);
      let distance = 1;

      while (currentWave.length > 0 && distance <= 3) {
        const nextWave: string[] = [];

        for (const key of currentWave) {
          const { q, r } = Tile.fromKey(key);
          const neighbors = this.grid.getNeighbors(q, r);

          for (const neighbor of neighbors) {
            const nKey = neighbor.getKey();
            if (!visited.has(nKey) && tileKeys.has(nKey)) {
              visited.add(nKey);
              tileDistances.set(nKey, distance);
              const edges = this.calculateBorderEdgesForOwner(neighbor.q, neighbor.r, ownerId, tileKeys);
              borderEdgesMap.set(nKey, edges);
              nextWave.push(nKey);
            }
          }
        }

        currentWave = nextWave;
        distance++;
      }

      regions.set(ownerId, { borderTiles, tileDistances, borderEdges: borderEdgesMap });
    }

    return regions;
  }

  private calculateBorderEdgesForOwner(q: number, r: number, _ownerId: string, ownerTiles: Set<string>): number[] {
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];
    
    const directionToEdge: { [key: number]: number } = {
      0: 1,
      1: 0,
      2: 5,
      3: 4,
      4: 3,
      5: 2
    };
    
    const borderEdges: number[] = [];
    
    for (let i = 0; i < 6; i++) {
      const [dq, dr] = directions[i];
      const nq = q + dq;
      const nr = r + dr;
      const nKey = `${nq},${nr}`;
      
      if (!ownerTiles.has(nKey)) {
        borderEdges.push(directionToEdge[i]);
      }
    }
    
    return borderEdges;
  }
}

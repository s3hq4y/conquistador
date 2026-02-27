import { GameSystem } from './GameSystem';
import { HexGrid, Tile, SceneData, TerrainTypeDefinition, OwnerTagDefinition, createEmptyScene, DEFAULT_TERRAIN_TYPES, DEFAULT_OWNER_TAGS, terrainInstanceToDefinition, ownerInstanceToDefinition, setEdgeConfigs } from '../map';
import type { GameEngine } from '../engine';
import { HexTile } from '../../components/HexTile';
import { TextureManager } from '../utils/TextureManager';
import { debug } from '../utils/debug';

type MapMode = 'NONE' | 'RANDOM' | 'CUSTOM';

export class MapSystem extends GameSystem {
  private grid: HexGrid;
  private hexSize: number;
  private tileEntities: Map<string, HexTile> = new Map();
  private mode: MapMode = 'NONE';
  private sceneData: SceneData;
  private terrainTypes: Map<string, TerrainTypeDefinition> = new Map();
  private ownerTags: Map<string, OwnerTagDefinition> = new Map();
  private textureManager: TextureManager;

  constructor(engine: GameEngine, hexSize: number = 50) {
    super(engine);
    this.hexSize = hexSize;
    this.grid = new HexGrid(10, hexSize);
    this.sceneData = createEmptyScene();
    this.textureManager = new TextureManager(engine.getApplication());
    this.initDefaultDefinitions();
  }

  getTextureManager(): TextureManager {
    return this.textureManager;
  }

  private initDefaultDefinitions(): void {
    Object.entries(DEFAULT_TERRAIN_TYPES).forEach(([id, instance]) => {
      this.terrainTypes.set(id, terrainInstanceToDefinition(id, instance));
    });
    Object.entries(DEFAULT_OWNER_TAGS).forEach(([id, instance]) => {
      this.ownerTags.set(id, ownerInstanceToDefinition(id, instance));
    });
  }

  initialize(): void {
    this.preloadTerrainTextures();
  }

  private async preloadTerrainTextures(): Promise<void> {
    const textureConfigs = new Map<string, number>(); // path -> rotateDegrees
    
    // 收集所有地形定义的纹理路径和旋转角度
    for (const terrainDef of this.terrainTypes.values()) {
      if (terrainDef.texture) {
        // 尖顶几何体旋转30°后视觉为平顶，所以纹理需要反向旋转210°（30° + 180°）
        textureConfigs.set(terrainDef.texture, 210);
      }
    }
    
    debug.scene('preloadTerrainTextures: terrain types count:', this.terrainTypes.size, 'texture configs:', textureConfigs.size);
    
    if (textureConfigs.size === 0) {
      debug.scene('preloadTerrainTextures: no textures to load');
      return Promise.resolve();
    }
    
    // 预加载所有纹理 - 使用 timeout 避免无限等待
    const loadPromises = Array.from(textureConfigs.entries()).map(([path, rotateDegrees]) => {
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => {
          debug.scene('Texture load timeout for:', path);
          resolve(null);
        }, 3000) // 3秒超时
      );
      return Promise.race([
        this.textureManager.loadTexture(path, rotateDegrees).catch(err => {
          debug.scene('Failed to load texture:', path, err);
          return null;
        }),
        timeoutPromise
      ]);
    });
    
    try {
      await Promise.all(loadPromises);
    } catch (err) {
      debug.scene('Error loading textures:', err);
    }
    
    debug.scene('preloadTerrainTextures: proceeding with tile creation (with or without textures)');
    return;
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
    this.sceneData.terrainTypes[def.id] = {
      components: {
        name: def.name,
        description: def.description,
        color: def.color,
        icon: def.icon,
        texture: def.texture,
        isWater: def.isWater,
        isPassable: def.isPassable,
        movementCost: def.movementCost
      }
    };
  }

  addOwnerTag(def: OwnerTagDefinition): void {
    this.ownerTags.set(def.id, def);
    this.sceneData.ownerTags[def.id] = {
      components: {
        name: def.name,
        description: def.description,
        color: def.color,
        icon: def.icon,
        isPlayer: def.isPlayer,
        isAI: def.isAI
      }
    };
  }

  updateTerrainType(def: TerrainTypeDefinition): void {
    this.terrainTypes.set(def.id, def);
    this.sceneData.terrainTypes[def.id] = {
      components: {
        name: def.name,
        description: def.description,
        color: def.color,
        icon: def.icon,
        isWater: def.isWater,
        isPassable: def.isPassable,
        movementCost: def.movementCost
      }
    };
  }

  updateOwnerTag(def: OwnerTagDefinition): void {
    this.ownerTags.set(def.id, def);
    this.sceneData.ownerTags[def.id] = {
      components: {
        name: def.name,
        description: def.description,
        color: def.color,
        icon: def.icon,
        isPlayer: def.isPlayer,
        isAI: def.isAI
      }
    };
  }

  private createTileEntity(tile: Tile): void {
    const app = this.engine.getApplication();
    const renderer = this.engine.getRenderer();
    const tileLayer = renderer.getTileLayer();

    const terrainDef = this.getTerrainDef(tile.terrain);
    const ownerDef = this.getOwnerDef(tile.owner);

    const hexTile = new HexTile(app, tile, this.hexSize, terrainDef, ownerDef, this.textureManager);
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
      tile.terrain = randomTerrain.id;
      tile.owner = tile.q < -3 ? 'enemy' : (tile.q > 3 ? 'neutral' : 'player');
      this.createTileEntity(tile);
    }

    this.updateAllBorderStates();
  }

  startCustomMap(): void {
    this.mode = 'CUSTOM';
    this.clearMap();

    const center = new Tile(0, 0);
    center.terrain = this.sceneData.settings.defaultTerrain;
    center.owner = this.sceneData.settings.defaultOwner;
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
    tile.terrain = this.sceneData.settings.defaultTerrain;
    tile.owner = this.sceneData.settings.defaultOwner;
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

  getSceneData(): SceneData {
    this.sceneData.tiles = this.grid.getTiles().map(t => t.toJSON());
    this.sceneData.modifiedAt = new Date().toISOString();
    return { ...this.sceneData };
  }

  loadSceneData(data: SceneData): boolean {
    try {
      debug.scene('loadSceneData called, tiles count:', data.tiles?.length || 0);
      this.sceneData = data;
      this.terrainTypes.clear();
      this.ownerTags.clear();
      
      Object.entries(data.terrainTypes).forEach(([id, instance]) => {
        this.terrainTypes.set(id, terrainInstanceToDefinition(id, instance));
      });
      Object.entries(data.ownerTags).forEach(([id, instance]) => {
        this.ownerTags.set(id, ownerInstanceToDefinition(id, instance));
      });
      
      if (data.edgeTypes) {
        setEdgeConfigs(data.edgeTypes as Record<string, { color: { r: number; g: number; b: number }; width: number; alpha: number; layers: number }>);
      }
      
      this.hexSize = data.settings.hexSize;
      this.grid = new HexGrid(10, this.hexSize);
      
      this.clearMap();
      
      debug.scene('Preloading terrain textures...');
      // 预加载场景的纹理
      this.preloadTerrainTextures()
        .then(() => {
          debug.scene('Texture preloaded, creating tiles...');
          // 纹理预加载完成后创建地块
          for (const tileData of data.tiles) {
            const tile = Tile.fromJSON(tileData);
            this.grid.addTile(tile);
            this.createTileEntity(tile);
          }
          debug.scene('Tiles created, tileEntities count:', this.tileEntities.size);
          this.updateAllBorderStates();
          this.engine.getEventBus().emit('map:loaded', data);
        })
        .catch(err => {
          debug.scene('Error in preloadTerrainTextures:', err);
          // 即使出错也尝试创建地块
          for (const tileData of data.tiles) {
            const tile = Tile.fromJSON(tileData);
            this.grid.addTile(tile);
            this.createTileEntity(tile);
          }
          debug.scene('Tiles created (after error), tileEntities count:', this.tileEntities.size);
          this.updateAllBorderStates();
          this.engine.getEventBus().emit('map:loaded', data);
        });
      
      return true;
    } catch (error) {
      debug.scene('Failed to load scene:', error);
      return false;
    }
  }

  setSceneName(name: string): void {
    this.sceneData.name = name;
  }

  setSceneDescription(description: string): void {
    this.sceneData.description = description;
  }

  updateTileOwner(q: number, r: number, owner: string): void {
    const tile = this.grid.getTile(q, r);
    const hexTile = this.tileEntities.get(`${q},${r}`);
    
    if (tile && hexTile) {
      tile.owner = owner;
      const ownerDef = this.getOwnerDef(owner);
      hexTile.setOwner(ownerDef);
      this.updateAllBorderStates();
    }
  }

  updateTileTerrain(q: number, r: number, terrain: string): void {
    const tile = this.grid.getTile(q, r);
    const hexTile = this.tileEntities.get(`${q},${r}`);
    
    if (tile && hexTile) {
      tile.terrain = terrain;
      const terrainDef = this.getTerrainDef(terrain);
      hexTile.setTerrain(terrainDef);
    }
  }

  updateAllBorderStates(): void {
    const ownerRegions = this.findOwnerRegions();
    
    for (const hexTile of this.tileEntities.values()) {
      const tile = hexTile.getTile();
      const key = tile.getKey();
      const region = ownerRegions.get(tile.owner);
      
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
      
      if (!neighbor || neighbor.owner !== tile.owner) {
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
      if (!ownerGroups.has(tile.owner)) {
        ownerGroups.set(tile.owner, new Set());
      }
      ownerGroups.get(tile.owner)!.add(tile.getKey());
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

import { GameSystem } from '@core/systems/GameSystem';
import { HexGrid, Tile, SceneData, TerrainTypeDefinition, OwnerTagDefinition, createEmptyScene, setEdgeConfigs } from '@core/map';
import type { GameEngine } from '@core/engine';
import { HexTile } from '@components/HexTile';
import { TextureManager } from '@core/utils/TextureManager';
import { debug } from '@core/utils/debug';
import { BorderSystem, TerrainRegistry } from './map';

type MapMode = 'NONE' | 'RANDOM' | 'CUSTOM';

export class MapSystem extends GameSystem {
  private grid: HexGrid;
  private hexSize: number;
  private tileEntities: Map<string, HexTile> = new Map();
  private mode: MapMode = 'NONE';
  private sceneData: SceneData;
  private textureManager: TextureManager;
  
  private borderSystem: BorderSystem;
  private terrainRegistry: TerrainRegistry;

  constructor(engine: GameEngine, hexSize: number = 50) {
    super(engine);
    this.hexSize = hexSize;
    this.grid = new HexGrid(10, hexSize);
    this.sceneData = createEmptyScene();
    this.textureManager = new TextureManager(engine.getApplication());
    this.borderSystem = new BorderSystem();
    this.terrainRegistry = new TerrainRegistry();
    this.borderSystem.setGrid(this.grid);
  }

  getTextureManager(): TextureManager {
    return this.textureManager;
  }

  initialize(): void {
    this.preloadTerrainTextures();
  }

  private async preloadTerrainTextures(): Promise<void> {
    const textureConfigs = new Map<string, number>();
    
    for (const terrainDef of this.terrainRegistry.getAllTerrainTypes()) {
      if (terrainDef.texture) {
        textureConfigs.set(terrainDef.texture, 210);
      }
    }
    
    debug.scene('preloadTerrainTextures: terrain types count:', this.terrainRegistry.getAllTerrainTypes().length, 'texture configs:', textureConfigs.size);
    
    if (textureConfigs.size === 0) {
      debug.scene('preloadTerrainTextures: no textures to load');
      return;
    }
    
    const loadPromises = Array.from(textureConfigs.entries()).map(([path, rotateDegrees]) => {
      return this.textureManager.loadTexture(path, rotateDegrees).catch(err => {
        debug.scene('Failed to load texture:', path, err);
        return null;
      });
    });
    
    try {
      await Promise.all(loadPromises);
    } catch (err) {
      debug.scene('Error loading textures:', err);
    }
    
    debug.scene('preloadTerrainTextures: proceeding with tile creation (with or without textures)');
    this.refreshAllTileTextures();
  }

  private refreshAllTileTextures(): void {
    for (const hexTile of this.tileEntities.values()) {
      hexTile.refreshTerrain(this.textureManager);
    }
    debug.scene('refreshAllTileTextures: refreshed', this.tileEntities.size, 'tiles');
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.tileEntities.forEach(hexTile => hexTile.destroy());
    this.tileEntities.clear();
  }

  getTerrainDef(id: string): TerrainTypeDefinition {
    return this.terrainRegistry.getTerrainDef(id);
  }

  getOwnerDef(id: string): OwnerTagDefinition {
    return this.terrainRegistry.getOwnerDef(id);
  }

  getAllTerrainTypes(): TerrainTypeDefinition[] {
    return this.terrainRegistry.getAllTerrainTypes();
  }

  getAllOwnerTags(): OwnerTagDefinition[] {
    return this.terrainRegistry.getAllOwnerTags();
  }

  addTerrainType(def: TerrainTypeDefinition): void {
    this.terrainRegistry.addTerrainType(def);
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
    this.terrainRegistry.addOwnerTag(def);
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
    this.terrainRegistry.updateTerrainType(def);
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
    this.terrainRegistry.updateOwnerTag(def);
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
      
      if (data.edgeTypes) {
        setEdgeConfigs(data.edgeTypes as Record<string, { color: { r: number; g: number; b: number }; width: number; alpha: number; layers: number }>);
      }
      
      this.hexSize = data.settings.hexSize;
      this.grid = new HexGrid(10, this.hexSize);
      this.borderSystem.setGrid(this.grid);
      
      this.clearMap();
      
      debug.scene('Preloading terrain textures...');
      
      const loadTiles = () => {
        // @ts-ignore - SceneData types are complex
        this.terrainRegistry.loadFromSceneData(data.terrainTypes, data.ownerTags);
        
        for (const tileData of data.tiles) {
          const tile = Tile.fromJSON(tileData);
          this.grid.addTile(tile);
          this.createTileEntity(tile);
        }
        debug.scene('Tiles created, tileEntities count:', this.tileEntities.size);
        this.updateAllBorderStates();
        this.engine.getEventBus().emit('map:loaded', data);
      };
      
      this.preloadTerrainTextures()
        .then(() => {
          debug.scene('Texture preloaded, creating tiles...');
          loadTiles();
        })
        .catch(err => {
          debug.scene('Error in preloadTerrainTextures:', err);
          loadTiles();
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
    this.borderSystem.updateAllBorderStates(this.tileEntities);
  }
}

import { GameSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { MapSystem, MovementSystem, UnitRenderSystem, EdgeSystem } from '../core/systems';
import type { SceneData } from '../core/map';
import type { OwnerStates } from '../stores/game';

declare global {
  interface Window {
    __setOwnerStates?: (states: OwnerStates) => void;
    __endTurn?: () => void;
  }
}

export class GameModeSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private edgeSystem: EdgeSystem | null = null;
  private unitRenderSystem: UnitRenderSystem | null = null;
  private selectedTileKey: string | null = null;
  private currentTurn: number = 1;

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;
    this.edgeSystem = this.engine.getSystems().find(s => s instanceof EdgeSystem) as EdgeSystem;
    this.unitRenderSystem = this.engine.getSystems().find(s => s instanceof UnitRenderSystem) as UnitRenderSystem;

    this.setupInputHandlers();

    window.__endTurn = () => this.endTurn();
    
    await this.loadDemoScene();
  }

  private setupInputHandlers(): void {
    const eventBus = this.engine.getEventBus();

    eventBus.on('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.mapSystem || !this.movementSystem || !this.unitRenderSystem) return;
    if (e.button !== 0) return;

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);
    const tileKey = `${hexPos.q},${hexPos.r}`;

    const clickedUnit = this.movementSystem.getUnitAt(hexPos.q, hexPos.r);

    if (clickedUnit) {
      this.clearTileSelection();
      this.unitRenderSystem.selectUnit(clickedUnit.id);
      console.log('Selected unit:', clickedUnit.id, 'at', hexPos.q, hexPos.r);
      return;
    }

    const reachableTiles = this.unitRenderSystem.getReachableTiles();

    if (reachableTiles.has(tileKey)) {
      const success = this.unitRenderSystem.moveSelectedUnit(hexPos.q, hexPos.r);
      if (success) {
        console.log('Moved to', hexPos.q, hexPos.r);
        const selectedId = this.unitRenderSystem.getSelectedUnitId();
        if (selectedId) {
          this.unitRenderSystem.selectUnit(selectedId);
        }
      }
      return;
    }

    this.unitRenderSystem.selectUnit(null);
    this.selectTile(tileKey, hexPos.q, hexPos.r);
  }

  private selectTile(key: string, q: number, r: number): void {
    this.clearTileSelection();
    this.selectedTileKey = key;

    if (this.mapSystem) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(key);
      if (hexTile) {
        hexTile.setSelected(true);
        console.log('Selected tile:', q, r);
      }
    }
  }

  private clearTileSelection(): void {
    if (this.selectedTileKey && this.mapSystem) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(this.selectedTileKey);
      if (hexTile) {
        hexTile.setSelected(false);
      }
    }
    this.selectedTileKey = null;
  }

  endTurn(): void {
    this.currentTurn++;
    this.clearTileSelection();
    this.unitRenderSystem?.selectUnit(null);

    if (this.movementSystem) {
      this.movementSystem.resetAllMoves();
    }

    this.engine.getEventBus().emit('turn:ended', this.currentTurn);
    console.log('Turn ended. New turn:', this.currentTurn);
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  update(_dt: number): void {
  }

  dispose(): void {
    const eventBus = this.engine.getEventBus();
    eventBus.off('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });
    this.clearTileSelection();
    window.__endTurn = undefined;
  }

  private async loadDemoScene(): Promise<void> {
    if (!this.mapSystem) return;

    try {
      const { sceneData, ownerStates } = await this.loadSceneFromFolder('example_battlefield');
      this.mapSystem.loadSceneData(sceneData);
      
      if (this.edgeSystem && sceneData.edges) {
        this.edgeSystem.loadFromInstances(sceneData.edges);
      }
      
      if (this.movementSystem && sceneData.units) {
        this.movementSystem.loadFromSceneData(sceneData);
      }
      
      if (window.__setOwnerStates) {
        window.__setOwnerStates(ownerStates);
      }
      
      console.log('Demo scene loaded:', sceneData.name, 'edges:', sceneData.edges?.length, 'units:', sceneData.units?.length);
    } catch (error) {
      console.error('Failed to load demo scene:', error);
    }
  }

  private async loadSceneFromFolder(sceneId: string): Promise<{ sceneData: SceneData; ownerStates: OwnerStates }> {
    const basePath = `/game_saves/${sceneId}`;
    
    const [manifest, terrainTypes, ownerTags, tiles, edges, units, terrainGroups, ownerStates] = await Promise.all([
      fetch(`${basePath}/manifest.json`).then(r => r.json()),
      fetch(`${basePath}/terrain_types.json`).then(r => r.json()),
      fetch(`${basePath}/owner_tags.json`).then(r => r.json()),
      fetch(`${basePath}/tiles.json`).then(r => r.json()),
      fetch(`${basePath}/edges.json`).then(r => r.json()).catch(() => []),
      fetch(`${basePath}/units.json`).then(r => r.json()).catch(() => []),
      fetch(`${basePath}/terrain_groups.json`).then(r => r.json()).catch(() => null),
      fetch(`${basePath}/owner_states.json`).then(r => r.json()).catch(() => ({}))
    ]);

    const sceneData: SceneData = {
      version: manifest.version,
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      createdAt: manifest.createdAt,
      modifiedAt: manifest.modifiedAt,
      settings: manifest.settings,
      terrainTypes: terrainTypes as any,
      ownerTags: ownerTags as any,
      tiles: tiles as any[],
      edges: edges as any[],
      units: units as any[],
      terrainGroups: terrainGroups as any
    };

    return { sceneData, ownerStates: ownerStates as OwnerStates };
  }
}

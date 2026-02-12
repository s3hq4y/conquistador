import * as pc from 'playcanvas';
import { GameSystem, MapSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { 
  TerrainTypeDefinition, 
  OwnerTagDefinition, 
  SceneData
} from '../core/map';
import * as sceneApi from './sceneApi';

export type EditorTool = 'select' | 'paint' | 'fill' | 'erase' | 'add' | 'drag_paint';
export type PaintMode = 'both' | 'terrain' | 'owner';

export class EditorSystem extends GameSystem {
  private currentTool: EditorTool = 'paint';
  private currentTerrainId: string = 'plains';
  private currentOwnerId: string = 'neutral';
  private paintMode: PaintMode = 'both';
  private isPainting: boolean = false;
  private lastPaintedTile: string | null = null;
  private hoveredTileKey: string | null = null;
  private selectedTiles: Set<string> = new Set();
  
  private mapSystem: MapSystem | null = null;
  private uiContainer: HTMLDivElement | null = null;
  private brushSize: number = 1;
  private currentSceneId: string | null = null;
  private debugFirstTile: { q: number; r: number } | null = null;
  private debugHighlightEntities: pc.Entity[] = [];

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.setupInputListeners();
    this.createUI();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.removeUI();
  }

  private setupInputListeners(): void {
    const eventBus = this.engine.getEventBus();

    eventBus.on('mousemove', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseMove(e);
    });

    eventBus.on('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });

    eventBus.on('mouseup', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseUp(e);
    });

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.mapSystem || !this.mapSystem.isCustomMode()) return;

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);
    const tileKey = `${hexPos.q},${hexPos.r}`;

    if (tileKey !== this.hoveredTileKey) {
      this.updateHoveredTile(tileKey);
    }

    if (this.isPainting && (this.currentTool === 'paint' || this.currentTool === 'drag_paint' || this.currentTool === 'erase')) {
      this.paintAtPosition(hexPos.q, hexPos.r);
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.mapSystem || !this.mapSystem.isCustomMode()) return;
    if (e.button !== 0) return;

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);

    if (e.shiftKey && this.currentTool === 'select') {
      this.handleDebugClick(hexPos.q, hexPos.r);
      return;
    }

    this.isPainting = true;
    this.lastPaintedTile = null;

    switch (this.currentTool) {
      case 'select':
        this.selectTile(hexPos.q, hexPos.r, e.shiftKey);
        break;
      case 'paint':
      case 'drag_paint':
        this.paintAtPosition(hexPos.q, hexPos.r);
        break;
      case 'fill':
        this.fillArea(hexPos.q, hexPos.r);
        break;
      case 'erase':
        this.eraseTile(hexPos.q, hexPos.r);
        break;
      case 'add':
        this.addTileAtPosition(hexPos.q, hexPos.r);
        break;
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isPainting = false;
    this.lastPaintedTile = null;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.mapSystem || !this.mapSystem.isCustomMode()) return;

    switch (e.key.toLowerCase()) {
      case 'q':
        this.setTool('select');
        break;
      case 'b':
        this.setTool('paint');
        break;
      case 'g':
        this.setTool('fill');
        break;
      case 'e':
        this.setTool('erase');
        break;
      case 'a':
        this.setTool('add');
        break;
      case 'd':
        this.setTool('drag_paint');
        break;
      case 'delete':
      case 'backspace':
        this.deleteSelectedTiles();
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.saveSceneToServer();
        }
        break;
      case 'o':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.showSceneList();
        }
        break;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      const terrains = this.mapSystem.getAllTerrainTypes();
      if (num <= terrains.length) {
        this.setTerrain(terrains[num - 1].id);
      }
    }
  }

  private updateHoveredTile(tileKey: string): void {
    const tileEntities = this.mapSystem?.getTileEntities();
    if (!tileEntities) return;

    if (this.hoveredTileKey) {
      const prevTile = tileEntities.get(this.hoveredTileKey);
      prevTile?.setHovered(false);
    }

    this.hoveredTileKey = tileKey;
    const newTile = tileEntities.get(tileKey);
    newTile?.setHovered(true);
  }

  private selectTile(q: number, r: number, addToSelection: boolean): void {
    const tileEntities = this.mapSystem?.getTileEntities();
    if (!tileEntities) return;

    const tileKey = `${q},${r}`;
    const hexTile = tileEntities.get(tileKey);

    if (!addToSelection) {
      this.selectedTiles.forEach(key => {
        const t = tileEntities.get(key);
        t?.setSelected(false);
      });
      this.selectedTiles.clear();
    }

    if (hexTile) {
      if (this.selectedTiles.has(tileKey)) {
        this.selectedTiles.delete(tileKey);
        hexTile.setSelected(false);
      } else {
        this.selectedTiles.add(tileKey);
        hexTile.setSelected(true);
      }
    }
  }

  private handleDebugClick(q: number, r: number): void {
    const grid = this.mapSystem?.getGrid();
    const tileEntities = this.mapSystem?.getTileEntities();
    if (!grid || !tileEntities) return;

    const tile = grid.getTile(q, r);
    
    if (!tile) {
      this.clearDebugHighlight();
      this.debugFirstTile = null;
      return;
    }

    if (!this.debugFirstTile) {
      this.debugFirstTile = { q, r };
      this.highlightDebugTile(q, r, new pc.Color(1, 1, 0, 0.5));
      console.log(`Debug: 第一个瓦片选中 (${q}, ${r})`);
    } else {
      const first = this.debugFirstTile;
      const second = { q, r };
      
      this.highlightDebugTile(q, r, new pc.Color(0, 1, 1, 0.5));
      
      const sharedEdge = this.findSharedEdge(first, second);
      
      if (sharedEdge !== null) {
        console.log(`Debug: 两个相邻瓦片 (${first.q},${first.r}) 和 (${second.q},${second.r}) 的共有边界是边 ${sharedEdge}`);
        this.showSharedEdgeHighlight(first, second, sharedEdge);
      } else {
        const distance = this.hexDistance(first.q, first.r, second.q, second.r);
        console.log(`Debug: 两个瓦片 (${first.q},${first.r}) 和 (${second.q},${second.r}) 不相邻，距离: ${distance}`);
      }
      
      setTimeout(() => {
        this.clearDebugHighlight();
        this.debugFirstTile = null;
      }, 3000);
    }
  }

  private hexDistance(q1: number, r1: number, q2: number, r2: number): number {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
  }

  private findSharedEdge(first: { q: number; r: number }, second: { q: number; r: number }): number | null {
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

    const dq = second.q - first.q;
    const dr = second.r - first.r;

    for (let i = 0; i < 6; i++) {
      if (directions[i][0] === dq && directions[i][1] === dr) {
        return directionToEdge[i];
      }
    }

    return null;
  }

  private highlightDebugTile(q: number, r: number, color: pc.Color): void {
    const grid = this.mapSystem?.getGrid();
    if (!grid) return;

    const app = (this.engine as any).app as pc.Application;
    if (!app) return;

    const hexSize = grid.getHexSize();
    const pos = grid.hexToPixel(q, r);

    const geometry = new pc.CylinderGeometry({
      radius: hexSize * 1.1,
      height: 10,
      heightSegments: 1,
      capSegments: 6
    });
    const mesh = pc.Mesh.fromGeometry(app.graphicsDevice, geometry);

    const material = new pc.StandardMaterial();
    material.diffuse = color;
    material.useLighting = false;
    material.emissive = color;
    material.emissiveIntensity = 0.8;
    material.opacity = 0.5;
    material.blendType = pc.BLEND_NORMAL;
    material.update();

    const meshInstance = new pc.MeshInstance(mesh, material);

    const entity = new pc.Entity(`DebugHighlight_${q}_${r}`);
    entity.addComponent('render', {
      meshInstances: [meshInstance],
      castShadows: false,
      receiveShadows: false
    });

    entity.setLocalPosition(pos.x, 5, pos.y);
    entity.setLocalEulerAngles(0, 30, 0);

    app.root.addChild(entity);
    this.debugHighlightEntities.push(entity);
  }

  private showSharedEdgeHighlight(first: { q: number; r: number }, second: { q: number; r: number }, _edgeIndex: number): void {
    const grid = this.mapSystem?.getGrid();
    if (!grid) return;

    const app = (this.engine as any).app as pc.Application;
    if (!app) return;

    const hexSize = grid.getHexSize();
    const pos1 = grid.hexToPixel(first.q, first.r);
    const pos2 = grid.hexToPixel(second.q, second.r);

    const midX = (pos1.x + pos2.x) / 2;
    const midZ = (pos1.y + pos2.y) / 2;

    const geometry = new pc.BoxGeometry({
      halfExtents: new pc.Vec3(hexSize * 0.6, 5, 4)
    });
    const mesh = pc.Mesh.fromGeometry(app.graphicsDevice, geometry);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(1, 0.5, 0);
    material.useLighting = false;
    material.emissive = new pc.Color(1, 0.5, 0);
    material.emissiveIntensity = 1;
    material.opacity = 0.8;
    material.blendType = pc.BLEND_NORMAL;
    material.update();

    const meshInstance = new pc.MeshInstance(mesh, material);

    const entity = new pc.Entity('DebugSharedEdge');
    entity.addComponent('render', {
      meshInstances: [meshInstance],
      castShadows: false,
      receiveShadows: false
    });

    const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
    entity.setLocalPosition(midX, 5, midZ);
    entity.setLocalEulerAngles(0, -angle * 180 / Math.PI + 90, 0);

    app.root.addChild(entity);
    this.debugHighlightEntities.push(entity);
  }

  private clearDebugHighlight(): void {
    this.debugHighlightEntities.forEach(entity => entity.destroy());
    this.debugHighlightEntities = [];
  }

  private paintAtPosition(q: number, r: number): void {
    const tileKey = `${q},${r}`;
    if (tileKey === this.lastPaintedTile) return;

    const tileEntities = this.mapSystem?.getTileEntities();
    const grid = this.mapSystem?.getGrid();
    if (!tileEntities || !grid) return;

    if (this.currentTool === 'erase') {
      this.eraseTile(q, r);
      this.lastPaintedTile = tileKey;
      return;
    }

    const tile = grid.getTile(q, r);
    if (tile) {
      const hexTile = tileEntities.get(tileKey);
      if (hexTile) {
        if (this.paintMode === 'terrain' || this.paintMode === 'both') {
          const terrainDef = this.mapSystem!.getTerrainDef(this.currentTerrainId);
          hexTile.setTerrain(terrainDef);
        }
        if (this.paintMode === 'owner' || this.paintMode === 'both') {
          const ownerDef = this.mapSystem!.getOwnerDef(this.currentOwnerId);
          hexTile.setOwner(ownerDef);
        }
        this.mapSystem!.updateAllBorderStates();
      }
    }

    this.lastPaintedTile = tileKey;
  }

  private fillArea(startQ: number, startR: number): void {
    const grid = this.mapSystem?.getGrid();
    const tileEntities = this.mapSystem?.getTileEntities();
    if (!grid || !tileEntities || !this.mapSystem) return;

    const startTile = grid.getTile(startQ, startR);
    if (!startTile) return;

    const paintMode = this.paintMode;

    if (paintMode === 'terrain' || paintMode === 'both') {
      const originalTerrain = startTile.terrainId;
      if (originalTerrain === this.currentTerrainId && paintMode !== 'both') return;

      const visited = new Set<string>();
      const queue: { q: number; r: number }[] = [{ q: startQ, r: startR }];

      while (queue.length > 0) {
        const { q, r } = queue.shift()!;
        const key = `${q},${r}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const tile = grid.getTile(q, r);
        if (!tile || tile.terrainId !== originalTerrain) continue;

        const hexTile = tileEntities.get(key);
        if (hexTile) {
          const terrainDef = this.mapSystem.getTerrainDef(this.currentTerrainId);
          hexTile.setTerrain(terrainDef);
          if (paintMode === 'both') {
            const ownerDef = this.mapSystem.getOwnerDef(this.currentOwnerId);
            hexTile.setOwner(ownerDef);
          }
        }

        const neighbors = grid.getNeighbors(q, r);
        for (const neighbor of neighbors) {
          const nKey = `${neighbor.q},${neighbor.r}`;
          if (!visited.has(nKey)) {
            queue.push({ q: neighbor.q, r: neighbor.r });
          }
        }
      }
    } else if (paintMode === 'owner') {
      const originalOwner = startTile.ownerId;
      if (originalOwner === this.currentOwnerId) return;

      const visited = new Set<string>();
      const queue: { q: number; r: number }[] = [{ q: startQ, r: startR }];

      while (queue.length > 0) {
        const { q, r } = queue.shift()!;
        const key = `${q},${r}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const tile = grid.getTile(q, r);
        if (!tile || tile.ownerId !== originalOwner) continue;

        const hexTile = tileEntities.get(key);
        if (hexTile) {
          const ownerDef = this.mapSystem.getOwnerDef(this.currentOwnerId);
          hexTile.setOwner(ownerDef);
        }

        const neighbors = grid.getNeighbors(q, r);
        for (const neighbor of neighbors) {
          const nKey = `${neighbor.q},${neighbor.r}`;
          if (!visited.has(nKey)) {
            queue.push({ q: neighbor.q, r: neighbor.r });
          }
        }
      }
    }

    this.mapSystem.updateAllBorderStates();
  }

  private eraseTile(q: number, r: number): void {
    const grid = this.mapSystem?.getGrid();
    const tileEntities = this.mapSystem?.getTileEntities();
    if (!grid || !tileEntities) return;

    const tileKey = `${q},${r}`;
    const tile = grid.getTile(q, r);
    
    if (tile) {
      const hexTile = tileEntities.get(tileKey);
      if (hexTile) {
        hexTile.destroy();
        tileEntities.delete(tileKey);
        grid.removeTile(q, r);
      }
    }
  }

  private addTileAtPosition(q: number, r: number): void {
    if (!this.mapSystem) return;
    
    const grid = this.mapSystem.getGrid();
    const existingTile = grid.getTile(q, r);
    
    if (!existingTile) {
      const newTile = this.mapSystem.addTileAt(q, r);
      if (newTile) {
        newTile.terrainId = this.currentTerrainId;
        newTile.ownerId = this.currentOwnerId;
        
        const tileEntities = this.mapSystem.getTileEntities();
        const hexTile = tileEntities.get(newTile.getKey());
        if (hexTile) {
          const terrainDef = this.mapSystem.getTerrainDef(this.currentTerrainId);
          const ownerDef = this.mapSystem.getOwnerDef(this.currentOwnerId);
          hexTile.setTerrain(terrainDef);
          hexTile.setOwner(ownerDef);
        }
      }
    }
  }

  private deleteSelectedTiles(): void {
    const grid = this.mapSystem?.getGrid();
    const tileEntities = this.mapSystem?.getTileEntities();
    if (!grid || !tileEntities) return;

    this.selectedTiles.forEach(key => {
      const hexTile = tileEntities.get(key);
      if (hexTile) {
        const tile = hexTile.getTile();
        hexTile.destroy();
        tileEntities.delete(key);
        grid.removeTile(tile.q, tile.r);
      }
    });

    this.selectedTiles.clear();
  }

  setTool(tool: EditorTool): void {
    this.currentTool = tool;
    this.updateUI();
  }

  setTerrain(terrainId: string): void {
    this.currentTerrainId = terrainId;
    this.updateUI();
  }

  setOwner(ownerId: string): void {
    this.currentOwnerId = ownerId;
    this.updateUI();
  }

  setPaintMode(mode: PaintMode): void {
    this.paintMode = mode;
    this.updateUI();
  }

  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(5, size));
    this.updateUI();
  }

  getBrushSize(): number {
    return this.brushSize;
  }

  getTool(): EditorTool {
    return this.currentTool;
  }

  async saveSceneToServer(): Promise<boolean> {
    if (!this.mapSystem) return false;
    
    try {
      const sceneData = this.mapSystem.getSceneData();
      
      if (this.currentSceneId) {
        await sceneApi.updateScene(this.currentSceneId, sceneData);
        console.log('Scene updated:', this.currentSceneId);
      } else {
        const sceneId = await sceneApi.saveScene(sceneData);
        this.currentSceneId = sceneId;
        console.log('Scene saved:', sceneId);
      }
      
      this.showToast('场景已保存', 'success');
      return true;
    } catch (error) {
      console.error('Failed to save scene:', error);
      this.showToast('保存失败', 'error');
      return false;
    }
  }

  async loadSceneFromServer(sceneId: string): Promise<boolean> {
    if (!this.mapSystem) return false;
    
    try {
      const sceneData = await sceneApi.loadScene(sceneId);
      const success = this.mapSystem.loadSceneData(sceneData);
      
      if (success) {
        this.currentSceneId = sceneId;
        this.rebuildUI();
        this.showToast(`已加载: ${sceneData.name}`, 'success');
      }
      return success;
    } catch (error) {
      console.error('Failed to load scene:', error);
      this.showToast('加载失败', 'error');
      return false;
    }
  }

  async showSceneList(): Promise<void> {
    try {
      const scenes = await sceneApi.listScenes();
      this.showSceneListModal(scenes);
    } catch (error) {
      console.error('Failed to list scenes:', error);
      this.showToast('获取场景列表失败', 'error');
    }
  }

  private showSceneListModal(scenes: sceneApi.SceneListItem[]): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <h4 style="margin: 0 0 16px 0; color: #e2e8f0;">场景列表</h4>
        <div id="scene-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 16px;">
          ${scenes.length === 0 ? '<p style="color: #94a3b8; text-align: center;">暂无保存的场景</p>' : ''}
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="modal-close" style="flex: 1; padding: 10px; background: rgba(100, 116, 139, 0.3); border: none; border-radius: 6px; color: #94a3b8; cursor: pointer;">关闭</button>
          <button id="modal-new" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 6px; color: white; cursor: pointer;">新建场景</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const listContainer = modal.querySelector('#scene-list');
    if (listContainer && scenes.length > 0) {
      scenes.forEach(scene => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 12px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(100, 116, 139, 0.2);
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        `;
        item.innerHTML = `
          <div style="font-weight: 500; color: #e2e8f0;">${scene.name}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
            作者: ${scene.author} | 修改: ${new Date(scene.modifiedAt).toLocaleDateString()}
          </div>
        `;
        item.onclick = () => {
          this.loadSceneFromServer(scene.id);
          modal.remove();
        };
        listContainer.appendChild(item);
      });
    }

    modal.querySelector('#modal-close')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#modal-new')?.addEventListener('click', () => {
      this.currentSceneId = null;
      this.mapSystem?.startCustomMap();
      this.rebuildUI();
      modal.remove();
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 
                    type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                    'rgba(59, 130, 246, 0.9)';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: ${bgColor};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 3000;
      animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  exportScene(): string {
    if (!this.mapSystem) return '';
    
    const sceneData = this.mapSystem.getSceneData();
    const json = JSON.stringify(sceneData, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sceneData.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return json;
  }

  importScene(jsonData: string): boolean {
    if (!this.mapSystem) return false;
    
    try {
      const data: SceneData = JSON.parse(jsonData);
      return this.mapSystem.loadSceneData(data);
    } catch (error) {
      console.error('Failed to import scene:', error);
      return false;
    }
  }

  triggerImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          if (this.importScene(content)) {
            this.rebuildUI();
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  showUI(): void {
    if (this.uiContainer) {
      this.uiContainer.style.display = 'block';
    }
  }

  hideUI(): void {
    if (this.uiContainer) {
      this.uiContainer.style.display = 'none';
    }
  }

  private rebuildUI(): void {
    this.removeUI();
    this.createUI();
  }

  private createUI(): void {
    const uiRoot = document.getElementById('ui');
    if (!uiRoot || !this.mapSystem) return;

    const terrains = this.mapSystem.getAllTerrainTypes();
    const owners = this.mapSystem.getAllOwnerTags();

    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'editor-ui';
    this.uiContainer.innerHTML = `
      <style>
        .editor-panel::-webkit-scrollbar { width: 6px; }
        .editor-panel::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); border-radius: 3px; }
        .editor-panel::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.5); border-radius: 3px; }
        .editor-panel::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.7); }
        .scrollable-list::-webkit-scrollbar { width: 4px; }
        .scrollable-list::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.3); border-radius: 2px; }
        .scrollable-list::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.4); border-radius: 2px; }
        .tab-btn { transition: all 0.2s; }
        .tab-btn.active { background: rgba(59, 130, 246, 0.3); color: #60a5fa; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .modal-content { background: rgba(15, 23, 42, 0.98); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 20px; max-width: 400px; width: 90%; }
      </style>
      <div class="editor-panel" style="
        position: fixed;
        top: 20px;
        left: 20px;
        width: 300px;
        max-height: calc(100vh - 40px);
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(100, 116, 139, 0.3);
        border-radius: 12px;
        padding: 16px;
        backdrop-filter: blur(12px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #e2e8f0;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        overflow-y: auto;
        overflow-x: hidden;
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(100, 116, 139, 0.2);">
          <span style="font-size: 20px;">🎬</span>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">场景编辑器</h3>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 8px; display: block;">工具</label>
          <div id="tool-buttons" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;"></div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 8px; display: block;">绘制模式</label>
          <div id="paint-mode-buttons" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
            <button id="mode-both" class="mode-btn" style="padding: 6px 4px; background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.5); border-radius: 6px; color: #60a5fa; font-size: 11px; cursor: pointer;">全部</button>
            <button id="mode-terrain" class="mode-btn" style="padding: 6px 4px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #94a3b8; font-size: 11px; cursor: pointer;">地形</button>
            <button id="mode-owner" class="mode-btn" style="padding: 6px 4px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #94a3b8; font-size: 11px; cursor: pointer;">所有者</button>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="display: flex; gap: 4px; margin-bottom: 8px;">
            <button id="tab-terrain" class="tab-btn active" style="flex: 1; padding: 6px 8px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px 6px 0 0; color: #94a3b8; font-size: 12px; cursor: pointer;">地形</button>
            <button id="tab-owner" class="tab-btn" style="flex: 1; padding: 6px 8px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px 6px 0 0; color: #94a3b8; font-size: 12px; cursor: pointer;">所有者</button>
          </div>
          <div id="terrain-panel" style="display: block;">
            <div id="terrain-grid" class="scrollable-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; max-height: 150px; overflow-y: auto; padding-right: 4px;"></div>
            <button id="btn-add-terrain" style="width: 100%; margin-top: 8px; padding: 6px; background: rgba(59, 130, 246, 0.2); border: 1px dashed rgba(59, 130, 246, 0.4); border-radius: 6px; color: #60a5fa; font-size: 11px; cursor: pointer;">+ 添加地形类型</button>
          </div>
          <div id="owner-panel" style="display: none;">
            <div id="owner-grid" class="scrollable-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; max-height: 150px; overflow-y: auto; padding-right: 4px;"></div>
            <button id="btn-add-owner" style="width: 100%; margin-top: 8px; padding: 6px; background: rgba(59, 130, 246, 0.2); border: 1px dashed rgba(59, 130, 246, 0.4); border-radius: 6px; color: #60a5fa; font-size: 11px; cursor: pointer;">+ 添加所有者标签</button>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 8px; display: block;">场景信息</label>
          <input id="scene-name" type="text" placeholder="场景名称" style="width: 100%; padding: 8px 12px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #e2e8f0; font-size: 13px; margin-bottom: 8px; box-sizing: border-box;">
          <textarea id="scene-desc" placeholder="场景描述" style="width: 100%; padding: 8px 12px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #e2e8f0; font-size: 13px; resize: vertical; min-height: 60px; box-sizing: border-box;"></textarea>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button id="btn-save" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 6px; color: white; font-size: 13px; font-weight: 500; cursor: pointer;">💾 保存</button>
          <button id="btn-load" style="flex: 1; padding: 10px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; font-size: 13px; cursor: pointer;">📂 加载</button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btn-export" style="flex: 1; padding: 8px; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #94a3b8; font-size: 12px; cursor: pointer;">📤 导出</button>
          <button id="btn-import" style="flex: 1; padding: 8px; background: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #94a3b8; font-size: 12px; cursor: pointer;">📥 导入</button>
        </div>

        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2);">
          <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
            <div style="margin-bottom: 4px;"><kbd style="padding: 2px 6px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; font-size: 10px;">Q</kbd> 选择 <kbd style="padding: 2px 6px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; font-size: 10px;">B</kbd> 绘制 <kbd style="padding: 2px 6px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; font-size: 10px;">G</kbd> 填充</div>
            <div style="margin-bottom: 4px;"><kbd style="padding: 2px 6px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; font-size: 10px;">E</kbd> 擦除 <kbd style="padding: 2px 6px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; font-size: 10px;">A</kbd> 添加 <kbd style="padding: 2px 6px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; font-size: 10px;">D</kbd> 拖拽绘制</div>
            <div><kbd style="padding: 2px 6px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; font-size: 10px;">1-9</kbd> 快速选择地形</div>
          </div>
        </div>
      </div>
    `;

    uiRoot.appendChild(this.uiContainer);

    this.createToolButtons();
    this.createTerrainButtons(terrains);
    this.createOwnerButtons(owners);
    this.setupEventListeners();
  }

  private createToolButtons(): void {
    const container = document.getElementById('tool-buttons');
    if (!container) return;

    const tools: { id: EditorTool; label: string; icon: string }[] = [
      { id: 'select', label: '选择', icon: '👆' },
      { id: 'paint', label: '绘制', icon: '🖌️' },
      { id: 'fill', label: '填充', icon: '🪣' },
      { id: 'erase', label: '擦除', icon: '🗑️' },
      { id: 'add', label: '添加', icon: '➕' },
      { id: 'drag_paint', label: '拖拽', icon: '✋' }
    ];

    tools.forEach(tool => {
      const btn = document.createElement('button');
      btn.id = `tool-${tool.id}`;
      btn.className = `tool-btn ${this.currentTool === tool.id ? 'active' : ''}`;
      btn.style.cssText = `
        padding: 8px 4px;
        background: ${this.currentTool === tool.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)'};
        border: 1px solid ${this.currentTool === tool.id ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)'};
        border-radius: 6px;
        color: ${this.currentTool === tool.id ? '#60a5fa' : '#94a3b8'};
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      btn.innerHTML = `<div style="font-size: 16px; margin-bottom: 2px;">${tool.icon}</div><div>${tool.label}</div>`;
      btn.onclick = () => this.setTool(tool.id);
      container.appendChild(btn);
    });
  }

  private createTerrainButtons(terrains: TerrainTypeDefinition[]): void {
    const container = document.getElementById('terrain-grid');
    if (!container) return;

    container.innerHTML = '';
    terrains.forEach(terrain => {
      const btn = document.createElement('button');
      btn.className = `terrain-btn ${this.currentTerrainId === terrain.id ? 'active' : ''}`;
      btn.style.cssText = `
        padding: 6px 8px;
        background: ${this.currentTerrainId === terrain.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)'};
        border: 1px solid ${this.currentTerrainId === terrain.id ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)'};
        border-radius: 6px;
        color: #e2e8f0;
        font-size: 11px;
        cursor: pointer;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      `;
      btn.innerHTML = `
        <span style="width: 12px; height: 12px; border-radius: 3px; background: ${terrain.color}; flex-shrink: 0;"></span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${terrain.nameZh}</span>
      `;
      btn.onclick = () => this.setTerrain(terrain.id);
      container.appendChild(btn);
    });
  }

  private createOwnerButtons(owners: OwnerTagDefinition[]): void {
    const container = document.getElementById('owner-grid');
    if (!container) return;

    container.innerHTML = '';
    owners.forEach(owner => {
      const btn = document.createElement('button');
      btn.className = `owner-btn ${this.currentOwnerId === owner.id ? 'active' : ''}`;
      btn.style.cssText = `
        padding: 6px 8px;
        background: ${this.currentOwnerId === owner.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)'};
        border: 1px solid ${this.currentOwnerId === owner.id ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)'};
        border-radius: 6px;
        color: #e2e8f0;
        font-size: 11px;
        cursor: pointer;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      `;
      btn.innerHTML = `
        <span style="width: 12px; height: 12px; border-radius: 50%; background: ${owner.color}; flex-shrink: 0;"></span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${owner.nameZh}</span>
      `;
      btn.onclick = () => this.setOwner(owner.id);
      container.appendChild(btn);
    });
  }

  private setupEventListeners(): void {
    const tabTerrain = document.getElementById('tab-terrain');
    const tabOwner = document.getElementById('tab-owner');
    const terrainPanel = document.getElementById('terrain-panel');
    const ownerPanel = document.getElementById('owner-panel');

    tabTerrain?.addEventListener('click', () => {
      tabTerrain.classList.add('active');
      tabOwner?.classList.remove('active');
      if (terrainPanel) terrainPanel.style.display = 'block';
      if (ownerPanel) ownerPanel.style.display = 'none';
    });

    tabOwner?.addEventListener('click', () => {
      tabOwner.classList.add('active');
      tabTerrain?.classList.remove('active');
      if (ownerPanel) ownerPanel.style.display = 'block';
      if (terrainPanel) terrainPanel.style.display = 'none';
    });

    document.getElementById('mode-both')?.addEventListener('click', () => this.setPaintMode('both'));
    document.getElementById('mode-terrain')?.addEventListener('click', () => this.setPaintMode('terrain'));
    document.getElementById('mode-owner')?.addEventListener('click', () => this.setPaintMode('owner'));

    document.getElementById('btn-save')?.addEventListener('click', () => this.saveSceneToServer());
    document.getElementById('btn-load')?.addEventListener('click', () => this.showSceneList());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportScene());
    document.getElementById('btn-import')?.addEventListener('click', () => this.triggerImport());

    const sceneNameInput = document.getElementById('scene-name') as HTMLInputElement;
    const sceneDescInput = document.getElementById('scene-desc') as HTMLTextAreaElement;

    sceneNameInput?.addEventListener('input', (e) => {
      this.mapSystem?.setSceneName((e.target as HTMLInputElement).value);
    });

    sceneDescInput?.addEventListener('input', (e) => {
      this.mapSystem?.setSceneDescription((e.target as HTMLTextAreaElement).value);
    });

    document.getElementById('btn-add-terrain')?.addEventListener('click', () => {
      this.showAddTerrainModal();
    });

    document.getElementById('btn-add-owner')?.addEventListener('click', () => {
      this.showAddOwnerModal();
    });
  }

  private showAddTerrainModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h4 style="margin: 0 0 16px 0; color: #e2e8f0;">添加地形类型</h4>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">ID</label>
          <input id="new-terrain-id" type="text" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #e2e8f0; font-size: 13px; box-sizing: border-box;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">名称</label>
          <input id="new-terrain-name" type="text" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #e2e8f0; font-size: 13px; box-sizing: border-box;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">颜色</label>
          <input id="new-terrain-color" type="color" value="#59a640" style="width: 100%; height: 36px; padding: 2px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; cursor: pointer;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="modal-cancel" style="flex: 1; padding: 10px; background: rgba(100, 116, 139, 0.3); border: none; border-radius: 6px; color: #94a3b8; cursor: pointer;">取消</button>
          <button id="modal-confirm" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 6px; color: white; cursor: pointer;">确认</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#modal-cancel')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#modal-confirm')?.addEventListener('click', () => {
      const id = (document.getElementById('new-terrain-id') as HTMLInputElement)?.value;
      const name = (document.getElementById('new-terrain-name') as HTMLInputElement)?.value;
      const color = (document.getElementById('new-terrain-color') as HTMLInputElement)?.value;

      if (id && name && color && this.mapSystem) {
        this.mapSystem.addTerrainType({
          id,
          name,
          nameZh: name,
          color,
          description: '',
          icon: '🎨',
          isPassable: true,
          movementCost: 1
        });
        this.rebuildUI();
      }
      modal.remove();
    });
  }

  private showAddOwnerModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h4 style="margin: 0 0 16px 0; color: #e2e8f0;">添加所有者标签</h4>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">ID</label>
          <input id="new-owner-id" type="text" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #e2e8f0; font-size: 13px; box-sizing: border-box;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">名称</label>
          <input id="new-owner-name" type="text" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; color: #e2e8f0; font-size: 13px; box-sizing: border-box;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 4px;">颜色</label>
          <input id="new-owner-color" type="color" value="#808080" style="width: 100%; height: 36px; padding: 2px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(100, 116, 139, 0.2); border-radius: 6px; cursor: pointer;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="modal-cancel" style="flex: 1; padding: 10px; background: rgba(100, 116, 139, 0.3); border: none; border-radius: 6px; color: #94a3b8; cursor: pointer;">取消</button>
          <button id="modal-confirm" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 6px; color: white; cursor: pointer;">确认</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#modal-cancel')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#modal-confirm')?.addEventListener('click', () => {
      const id = (document.getElementById('new-owner-id') as HTMLInputElement)?.value;
      const name = (document.getElementById('new-owner-name') as HTMLInputElement)?.value;
      const color = (document.getElementById('new-owner-color') as HTMLInputElement)?.value;

      if (id && name && color && this.mapSystem) {
        this.mapSystem.addOwnerTag({
          id,
          name,
          nameZh: name,
          color,
          description: '',
          icon: '🏷️',
          isPlayer: false,
          isAI: false
        });
        this.rebuildUI();
      }
      modal.remove();
    });
  }

  private updateUI(): void {
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
      const toolId = btn.id.replace('tool-', '');
      const isActive = toolId === this.currentTool;
      (btn as HTMLElement).style.background = isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)';
      (btn as HTMLElement).style.borderColor = isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)';
      (btn as HTMLElement).style.color = isActive ? '#60a5fa' : '#94a3b8';
    });

    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      const modeId = btn.id.replace('mode-', '');
      const isActive = modeId === this.paintMode;
      (btn as HTMLElement).style.background = isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)';
      (btn as HTMLElement).style.borderColor = isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)';
      (btn as HTMLElement).style.color = isActive ? '#60a5fa' : '#94a3b8';
    });

    const terrainButtons = document.querySelectorAll('.terrain-btn');
    terrainButtons.forEach(btn => {
      const btnElement = btn as HTMLElement;
      const terrainId = Array.from(btnElement.children)[1]?.textContent;
      const isActive = terrainId === this.currentTerrainId;
      btnElement.style.background = isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)';
      btnElement.style.borderColor = isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)';
    });

    const ownerButtons = document.querySelectorAll('.owner-btn');
    ownerButtons.forEach(btn => {
      const btnElement = btn as HTMLElement;
      const ownerId = Array.from(btnElement.children)[1]?.textContent;
      const isActive = ownerId === this.currentOwnerId;
      btnElement.style.background = isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)';
      btnElement.style.borderColor = isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)';
    });
  }

  private removeUI(): void {
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = null;
    }
  }
}

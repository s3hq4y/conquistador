import { GameSystem } from './GameSystem';
import type { GameEngine } from '../engine/GameEngine';
import { MapSystem } from './MapSystem';
import { 
  TerrainTypeDefinition, 
  OwnerTagDefinition, 
  SceneData
} from '../core/SceneData';
import * as sceneApi from '../api/sceneApi';

export type EditorTool = 'select' | 'paint' | 'fill' | 'erase' | 'add' | 'drag_paint';

export class EditorSystem extends GameSystem {
  private currentTool: EditorTool = 'paint';
  private currentTerrainId: string = 'plains';
  private currentOwnerId: string = 'neutral';
  private isPainting: boolean = false;
  private lastPaintedTile: string | null = null;
  private hoveredTileKey: string | null = null;
  private selectedTiles: Set<string> = new Set();
  
  private mapSystem: MapSystem | null = null;
  private uiContainer: HTMLDivElement | null = null;
  private brushSize: number = 1;
  private currentSceneId: string | null = null;

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
        const terrainDef = this.mapSystem!.getTerrainDef(this.currentTerrainId);
        const ownerDef = this.mapSystem!.getOwnerDef(this.currentOwnerId);
        hexTile.setTerrain(terrainDef);
        hexTile.setOwner(ownerDef);
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

    const originalTerrain = startTile.terrainId;
    if (originalTerrain === this.currentTerrainId) return;

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
        const ownerDef = this.mapSystem.getOwnerDef(this.currentOwnerId);
        hexTile.setTerrain(terrainDef);
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

  setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(5, size));
    this.updateUI();
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
            <button id="btn-add-owner" style="width: 100%; margin-top: 8px; padding: 6px; background: rgba(16, 185, 129, 0.2); border: 1px dashed rgba(16, 185, 129, 0.4); border-radius: 6px; color: #34d399; font-size: 11px; cursor: pointer;">+ 添加所有者标签</button>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 8px; display: block;">
            笔刷大小: <span id="brush-size-value">1</span>
          </label>
          <input type="range" id="brush-size" min="1" max="5" value="1" style="width: 100%; cursor: pointer;">
        </div>
        
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="btn-export" style="flex: 1; padding: 10px 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;">💾 保存场景</button>
          <button id="btn-import" style="flex: 1; padding: 10px 12px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;">📂 加载场景</button>
        </div>
        
        <div style="padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2);">
          <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
            <div><kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">Q</kbd> 选择 <kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">B</kbd> 绘制 <kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">G</kbd> 填充</div>
            <div><kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">E</kbd> 擦除 <kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">A</kbd> 添加 <kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">D</kbd> 拖拽</div>
            <div><kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">1-9</kbd> 切换地形 <kbd style="background: rgba(51, 65, 85, 0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px;">Ctrl+S</kbd> 保存</div>
          </div>
        </div>
      </div>
    `;

    uiRoot.appendChild(this.uiContainer);
    this.setupUIEvents(terrains, owners);
    this.updateUI();
  }

  private setupUIEvents(terrains: TerrainTypeDefinition[], owners: OwnerTagDefinition[]): void {
    const toolButtons = this.uiContainer?.querySelector('#tool-buttons');
    if (toolButtons) {
      const tools: { id: EditorTool; label: string; icon: string }[] = [
        { id: 'select', label: '选择', icon: '↖' },
        { id: 'paint', label: '绘制', icon: '🖌' },
        { id: 'fill', label: '填充', icon: '🪣' },
        { id: 'erase', label: '擦除', icon: '🗑' },
        { id: 'add', label: '添加', icon: '+' },
        { id: 'drag_paint', label: '拖拽', icon: '✋' }
      ];

      tools.forEach(tool => {
        const btn = document.createElement('button');
        btn.id = `tool-${tool.id}`;
        btn.className = 'tool-btn';
        btn.innerHTML = `<span style="font-size: 16px;">${tool.icon}</span><span style="font-size: 10px; display: block;">${tool.label}</span>`;
        btn.style.cssText = `
          padding: 8px 4px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(100, 116, 139, 0.2);
          border-radius: 6px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        `;
        btn.onclick = () => this.setTool(tool.id);
        toolButtons.appendChild(btn);
      });
    }

    const terrainGrid = this.uiContainer?.querySelector('#terrain-grid');
    if (terrainGrid) {
      terrains.forEach(terrain => {
        const btn = this.createTerrainButton(terrain);
        terrainGrid.appendChild(btn);
      });
    }

    const ownerGrid = this.uiContainer?.querySelector('#owner-grid');
    if (ownerGrid) {
      owners.forEach(owner => {
        const btn = this.createOwnerButton(owner);
        ownerGrid.appendChild(btn);
      });
    }

    const tabTerrain = this.uiContainer?.querySelector('#tab-terrain');
    const tabOwner = this.uiContainer?.querySelector('#tab-owner');
    const terrainPanel = this.uiContainer?.querySelector('#terrain-panel');
    const ownerPanel = this.uiContainer?.querySelector('#owner-panel');

    tabTerrain?.addEventListener('click', () => {
      tabTerrain.classList.add('active');
      tabOwner?.classList.remove('active');
      if (terrainPanel) (terrainPanel as HTMLElement).style.display = 'block';
      if (ownerPanel) (ownerPanel as HTMLElement).style.display = 'none';
    });

    tabOwner?.addEventListener('click', () => {
      tabOwner?.classList.add('active');
      tabTerrain?.classList.remove('active');
      if (ownerPanel) (ownerPanel as HTMLElement).style.display = 'block';
      if (terrainPanel) (terrainPanel as HTMLElement).style.display = 'none';
    });

    const addTerrainBtn = this.uiContainer?.querySelector('#btn-add-terrain');
    addTerrainBtn?.addEventListener('click', () => this.showAddTerrainModal());

    const addOwnerBtn = this.uiContainer?.querySelector('#btn-add-owner');
    addOwnerBtn?.addEventListener('click', () => this.showAddOwnerModal());

    const brushSizeInput = this.uiContainer?.querySelector('#brush-size') as HTMLInputElement;
    if (brushSizeInput) {
      brushSizeInput.oninput = () => {
        this.setBrushSize(parseInt(brushSizeInput.value));
      };
    }

    const exportBtn = this.uiContainer?.querySelector('#btn-export') as HTMLButtonElement | null;
    if (exportBtn) {
      exportBtn.onclick = () => this.saveSceneToServer();
    }

    const importBtn = this.uiContainer?.querySelector('#btn-import') as HTMLButtonElement | null;
    if (importBtn) {
      importBtn.onclick = () => this.showSceneList();
    }
  }

  private createTerrainButton(terrain: TerrainTypeDefinition): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = `terrain-${terrain.id}`;
    btn.className = 'terrain-btn';
    btn.innerHTML = `<span style="font-size: 14px;">${terrain.icon}</span><span style="font-size: 11px;">${terrain.nameZh}</span>`;
    
    const hexColor = terrain.color;
    btn.style.cssText = `
      padding: 6px 8px;
      background: ${hexColor}33;
      border: 1px solid ${hexColor}66;
      border-radius: 6px;
      color: #e2e8f0;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    `;
    btn.title = terrain.description;
    btn.onclick = () => this.setTerrain(terrain.id);
    return btn;
  }

  private createOwnerButton(owner: OwnerTagDefinition): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = `owner-${owner.id}`;
    btn.className = 'owner-btn';
    btn.innerHTML = `<span style="font-size: 14px;">${owner.icon}</span><span style="font-size: 11px;">${owner.nameZh}</span>`;
    
    const hexColor = owner.color;
    btn.style.cssText = `
      padding: 6px 8px;
      background: ${hexColor}33;
      border: 1px solid ${hexColor}66;
      border-radius: 6px;
      color: #e2e8f0;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    `;
    btn.title = owner.description;
    btn.onclick = () => this.setOwner(owner.id);
    return btn;
  }

  private showAddTerrainModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h4 style="margin: 0 0 16px 0; color: #e2e8f0;">添加地形类型</h4>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">ID (英文)</label>
          <input type="text" id="new-terrain-id" placeholder="例如: lava" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #e2e8f0; font-size: 13px;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">名称 (中文)</label>
          <input type="text" id="new-terrain-name" placeholder="例如: 熔岩" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #e2e8f0; font-size: 13px;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">颜色</label>
          <input type="color" id="new-terrain-color" value="#ff6600" style="width: 100%; height: 36px; padding: 2px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; cursor: pointer;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">图标 (emoji)</label>
          <input type="text" id="new-terrain-icon" placeholder="🔥" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #e2e8f0; font-size: 13px;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="modal-cancel" style="flex: 1; padding: 10px; background: rgba(100, 116, 139, 0.3); border: none; border-radius: 6px; color: #94a3b8; cursor: pointer;">取消</button>
          <button id="modal-confirm" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 6px; color: white; cursor: pointer;">添加</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#modal-cancel')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#modal-confirm')?.addEventListener('click', () => {
      const id = (modal.querySelector('#new-terrain-id') as HTMLInputElement).value.trim();
      const name = (modal.querySelector('#new-terrain-name') as HTMLInputElement).value.trim();
      const colorHex = (modal.querySelector('#new-terrain-color') as HTMLInputElement).value;
      const icon = (modal.querySelector('#new-terrain-icon') as HTMLInputElement).value.trim() || '⬜';

      if (id && name) {
        const newTerrain: TerrainTypeDefinition = {
          id: id.toLowerCase().replace(/\s+/g, '_'),
          name: id,
          nameZh: name,
          color: colorHex,
          description: `自定义地形: ${name}`,
          icon,
          isPassable: true,
          movementCost: 1
        };
        this.mapSystem?.addTerrainType(newTerrain);
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
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">ID (英文)</label>
          <input type="text" id="new-owner-id" placeholder="例如: ally" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #e2e8f0; font-size: 13px;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">名称 (中文)</label>
          <input type="text" id="new-owner-name" placeholder="例如: 盟友" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #e2e8f0; font-size: 13px;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">颜色</label>
          <input type="color" id="new-owner-color" value="#00ff00" style="width: 100%; height: 36px; padding: 2px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; cursor: pointer;">
        </div>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">图标 (emoji)</label>
          <input type="text" id="new-owner-icon" placeholder="🟢" style="width: 100%; padding: 8px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; color: #e2e8f0; font-size: 13px;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="modal-cancel" style="flex: 1; padding: 10px; background: rgba(100, 116, 139, 0.3); border: none; border-radius: 6px; color: #94a3b8; cursor: pointer;">取消</button>
          <button id="modal-confirm" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 6px; color: white; cursor: pointer;">添加</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#modal-cancel')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#modal-confirm')?.addEventListener('click', () => {
      const id = (modal.querySelector('#new-owner-id') as HTMLInputElement).value.trim();
      const name = (modal.querySelector('#new-owner-name') as HTMLInputElement).value.trim();
      const colorHex = (modal.querySelector('#new-owner-color') as HTMLInputElement).value;
      const icon = (modal.querySelector('#new-owner-icon') as HTMLInputElement).value.trim() || '⬜';

      if (id && name) {
        const newOwner: OwnerTagDefinition = {
          id: id.toLowerCase().replace(/\s+/g, '_'),
          name: id,
          nameZh: name,
          color: colorHex,
          description: `自定义所有者: ${name}`,
          icon,
          isPlayer: false,
          isAI: false
        };
        this.mapSystem?.addOwnerTag(newOwner);
        this.rebuildUI();
      }
      modal.remove();
    });
  }

  private updateUI(): void {
    if (!this.uiContainer) return;

    this.uiContainer.querySelectorAll('.tool-btn').forEach((btn) => {
      const el = btn as HTMLButtonElement;
      const isActive = el.id === `tool-${this.currentTool}`;
      el.style.background = isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)';
      el.style.borderColor = isActive ? 'rgba(59, 130, 246, 0.6)' : 'rgba(100, 116, 139, 0.2)';
      el.style.color = isActive ? '#60a5fa' : '#94a3b8';
    });

    this.uiContainer.querySelectorAll('.terrain-btn').forEach((btn) => {
      const el = btn as HTMLButtonElement;
      const isActive = el.id === `terrain-${this.currentTerrainId}`;
      el.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
      el.style.boxShadow = isActive ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none';
    });

    this.uiContainer.querySelectorAll('.owner-btn').forEach((btn) => {
      const el = btn as HTMLButtonElement;
      const isActive = el.id === `owner-${this.currentOwnerId}`;
      el.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
      el.style.boxShadow = isActive ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none';
    });

    const brushSizeValue = this.uiContainer?.querySelector('#brush-size-value');
    if (brushSizeValue) {
      brushSizeValue.textContent = this.brushSize.toString();
    }
  }

  private removeUI(): void {
    this.uiContainer?.remove();
    this.uiContainer = null;
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
}

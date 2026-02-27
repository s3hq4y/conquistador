import type { MapSystem, EdgeSystem, MovementSystem } from '../../core/systems';
import type { EditorUI } from '../EditorUI';
import type { SceneData, TerrainTypeDefinition, OwnerTagDefinition } from '../../core/map';
import type { TraitData } from '../../core/traits';
import { TraitManager } from '../../core/traits';
import { SCENE_BASE_PATH } from '../../core/config';
import { debug } from '../../core/utils/debug';
import * as sceneApi from '../sceneApi';

export class SceneManager {
  private mapSystem: MapSystem | null;
  private edgeSystem: EdgeSystem | null;
  private movementSystem: MovementSystem | null;
  private editorUI: EditorUI | null;
  private traitManager: TraitManager | null = null;
  private currentSceneId: string | null = null;

  constructor(mapSystem: MapSystem | null, editorUI: EditorUI | null) {
    this.mapSystem = mapSystem;
    this.editorUI = editorUI;
    this.edgeSystem = null;
    this.movementSystem = null;
  }

  setMapSystem(mapSystem: MapSystem | null): void {
    this.mapSystem = mapSystem;
  }

  setEdgeSystem(edgeSystem: EdgeSystem | null): void {
    this.edgeSystem = edgeSystem;
  }

  setMovementSystem(movementSystem: MovementSystem | null): void {
    this.movementSystem = movementSystem;
  }

  setEditorUI(editorUI: EditorUI | null): void {
    this.editorUI = editorUI;
  }

  setTraitManager(traitManager: TraitManager | null): void {
    this.traitManager = traitManager;
  }

  getCurrentSceneId(): string | null {
    return this.currentSceneId;
  }

  async saveSceneToServer(): Promise<void> {
    if (!this.mapSystem) {
      debug.editor('sceneManager', 'No mapSystem, cannot save');
      return;
    }
    
    try {
      const sceneData = this.mapSystem.getSceneData();
      
      debug.editor('sceneManager', 'edgeSystem exists:', !!this.edgeSystem);
      debug.editor('sceneManager', 'Saving scene, edges count:', this.edgeSystem ? this.edgeSystem.toInstances().length : 0);
      
      if (this.edgeSystem) {
        const instances = this.edgeSystem.toInstances();
        debug.editor('sceneManager', 'Edge instances:', instances);
        sceneData.edges = instances;
        debug.editor('sceneManager', 'Edges to save:', JSON.stringify(sceneData.edges));
      } else {
        debug.editor('sceneManager', 'edgeSystem is null!');
      }

      if (this.movementSystem) {
        sceneData.units = this.movementSystem.getSceneDataUnits();
        debug.editor('sceneManager', 'Units to save:', JSON.stringify(sceneData.units));
      }
      
      if (this.currentSceneId) {
        await sceneApi.updateScene(this.currentSceneId, sceneData);
        debug.editor('sceneManager', 'Scene updated:', this.currentSceneId);
      } else {
        const sceneId = await sceneApi.saveScene(sceneData);
        this.currentSceneId = sceneId;
        debug.editor('sceneManager', 'Scene saved:', sceneId);
      }
      
      this.editorUI?.showToast('场景已保存', 'success');
    } catch (error) {
      debug.editor('sceneManager', 'Failed to save scene:', error);
      this.editorUI?.showToast('保存场景失败', 'error');
    }
  }

  async loadSceneFromServer(sceneId: string): Promise<boolean> {
    if (!this.mapSystem) return false;
    
    try {
      debug.editor('sceneManager', 'Loading scene:', sceneId);
      const sceneData = await sceneApi.loadScene(sceneId);
      debug.editor('sceneManager', 'Full sceneData:', { 
        hasTiles: 'tiles' in sceneData,
        tilesCount: sceneData.tiles?.length || 0,
        hasEdges: 'edges' in sceneData, 
        edgesValue: sceneData.edges,
        edgesType: typeof sceneData.edges,
        hexSize: sceneData.settings?.hexSize
      });
      debug.editor('sceneManager', 'Loaded scene data, tiles:', sceneData.tiles?.length || 0, 'edges:', sceneData.edges?.length || 0);
      
      const success = this.mapSystem.loadSceneData(sceneData);
      
      if (success) {
        this.currentSceneId = sceneId;
        
        if (this.edgeSystem) {
          const edges = sceneData.edges;
          debug.editor('sceneManager', 'Edge data:', edges);
          if (edges && edges.length > 0) {
            debug.editor('sceneManager', 'Loading edges:', JSON.stringify(edges));
            this.edgeSystem.loadFromInstances(edges);
          } else {
            debug.editor('sceneManager', 'No edges to load');
          }
        }
        
        if (this.movementSystem && sceneData.units) {
          debug.editor('sceneManager', 'Loading units:', sceneData.units.length);
          this.movementSystem.loadFromSceneData(sceneData);
        }

        await this.loadTraits(sceneId);
        
        this.updateUI();
        this.editorUI?.showToast('场景已加载', 'success');
        return true;
      } else {
        this.editorUI?.showToast('加载场景失败', 'error');
        return false;
      }
    } catch (error) {
      debug.editor('sceneManager', 'Failed to load scene:', error);
      this.editorUI?.showToast('加载场景失败', 'error');
      return false;
    }
  }

  async loadTraits(sceneId: string): Promise<void> {
    try {
      const response = await fetch(`${SCENE_BASE_PATH}/${sceneId}/traits.json`);
      if (response.ok) {
        const traitData: TraitData = await response.json();
        this.editorUI?.setTraits(traitData.traits || {});
        this.editorUI?.setTraitTypes(traitData.traitTypes || {});
        if (this.traitManager) {
          this.traitManager.loadTraitData(traitData);
        }
        debug.editor('sceneManager', 'Loaded traits:', Object.keys(traitData.traits || {}).length);
      } else {
        const fallbackResponse = await fetch(`/game_saves/${sceneId}/traits.json`);
        if (fallbackResponse.ok) {
          const traitData: TraitData = await fallbackResponse.json();
          this.editorUI?.setTraits(traitData.traits || {});
          this.editorUI?.setTraitTypes(traitData.traitTypes || {});
          if (this.traitManager) {
            this.traitManager.loadTraitData(traitData);
          }
        }
      }
    } catch (error) {
      debug.editor('sceneManager', 'Failed to load traits:', error);
    }
  }

  exportScene(): void {
    if (!this.mapSystem) return;

    const sceneData = this.mapSystem.getSceneData();
    
    if (this.edgeSystem) {
      sceneData.edges = this.edgeSystem.toInstances();
    }
    
    if (this.movementSystem) {
      sceneData.units = this.movementSystem.getSceneDataUnits();
    }
    
    const json = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${sceneData.id || 'scene'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.editorUI?.showToast('场景已导出', 'success');
  }

  importScene(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const sceneData = JSON.parse(json) as SceneData;
        
        if (this.mapSystem?.loadSceneData(sceneData)) {
          this.currentSceneId = sceneData.id;
          
          if (this.edgeSystem && sceneData.edges) {
            this.edgeSystem.loadFromInstances(sceneData.edges);
          }
          
          if (this.movementSystem && sceneData.units) {
            this.movementSystem.loadFromSceneData(sceneData);
          }
          
          this.updateUI();
          this.editorUI?.showToast('场景已导入', 'success');
        } else {
          this.editorUI?.showToast('导入场景失败', 'error');
        }
      } catch (error) {
        debug.editor('sceneManager', 'Failed to import scene:', error);
        this.editorUI?.showToast('导入场景失败', 'error');
      }
    };
    reader.readAsText(file);
  }

  addTerrainType(terrain: { id: string; name: string; color: string }): void {
    if (!this.mapSystem) return;

    const newTerrain: TerrainTypeDefinition = {
      id: terrain.id,
      name: { en: terrain.name, zh: terrain.name },
      description: { en: '', zh: '' },
      color: terrain.color,
      icon: '🎨'
    };

    this.mapSystem.addTerrainType(newTerrain);
    this.editorUI?.setTerrains(this.mapSystem.getAllTerrainTypes());
    this.editorUI?.showToast('地形类型已添加', 'success');
  }

  addOwnerTag(owner: { id: string; name: string; color: string }): void {
    if (!this.mapSystem) return;

    const newOwner: OwnerTagDefinition = {
      id: owner.id,
      name: { en: owner.name, zh: owner.name },
      description: { en: '', zh: '' },
      color: owner.color,
      icon: '👤'
    };

    this.mapSystem.addOwnerTag(newOwner);
    this.editorUI?.setOwners(this.mapSystem.getAllOwnerTags());
    this.editorUI?.showToast('所有者标签已添加', 'success');
  }

  private updateUI(): void {
    if (!this.mapSystem || !this.editorUI) return;

    const sceneData = this.mapSystem.getSceneData();
    this.editorUI.setSceneName(sceneData.name);
    this.editorUI.setSceneDescription(sceneData.description);
  }
}

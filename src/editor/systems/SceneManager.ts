import type { MapSystem } from '../../core/systems';
import type { EditorUI } from '../EditorUI';
import type { SceneData, TerrainTypeDefinition, OwnerTagDefinition } from '../../core/map';
import * as sceneApi from '../sceneApi';

export class SceneManager {
  private mapSystem: MapSystem | null;
  private editorUI: EditorUI | null;
  private currentSceneId: string | null = null;

  constructor(mapSystem: MapSystem | null, editorUI: EditorUI | null) {
    this.mapSystem = mapSystem;
    this.editorUI = editorUI;
  }

  setMapSystem(mapSystem: MapSystem | null): void {
    this.mapSystem = mapSystem;
  }

  setEditorUI(editorUI: EditorUI | null): void {
    this.editorUI = editorUI;
  }

  getCurrentSceneId(): string | null {
    return this.currentSceneId;
  }

  async saveSceneToServer(): Promise<void> {
    if (!this.mapSystem) return;
    
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
      
      this.editorUI?.showToast('场景已保存', 'success');
    } catch (error) {
      console.error('Failed to save scene:', error);
      this.editorUI?.showToast('保存场景失败', 'error');
    }
  }

  async loadSceneFromServer(sceneId: string): Promise<boolean> {
    if (!this.mapSystem) return false;
    
    try {
      const sceneData = await sceneApi.loadScene(sceneId);
      const success = this.mapSystem.loadSceneData(sceneData);
      
      if (success) {
        this.currentSceneId = sceneId;
        this.updateUI();
        this.editorUI?.showToast('场景已加载', 'success');
        return true;
      } else {
        this.editorUI?.showToast('加载场景失败', 'error');
        return false;
      }
    } catch (error) {
      console.error('Failed to load scene:', error);
      this.editorUI?.showToast('加载场景失败', 'error');
      return false;
    }
  }

  exportScene(): void {
    if (!this.mapSystem) return;

    const sceneData = this.mapSystem.getSceneData();
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
          this.updateUI();
          this.editorUI?.showToast('场景已导入', 'success');
        } else {
          this.editorUI?.showToast('导入场景失败', 'error');
        }
      } catch (error) {
        console.error('Failed to import scene:', error);
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

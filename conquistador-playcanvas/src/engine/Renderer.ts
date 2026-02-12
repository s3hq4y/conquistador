import * as pc from 'playcanvas';
import { Camera } from './Camera';

export class Renderer {
  private app: pc.Application;
  private tileLayer!: pc.Entity;
  private unitLayer!: pc.Entity;
  private effectLayer!: pc.Entity;

  constructor(app: pc.Application) {
    this.app = app;
    this.initLayers();
  }

  private initLayers(): void {
    this.tileLayer = new pc.Entity('TileLayer');
    this.unitLayer = new pc.Entity('UnitLayer');
    this.effectLayer = new pc.Entity('EffectLayer');

    this.app.root.addChild(this.tileLayer);
    this.app.root.addChild(this.unitLayer);
    this.app.root.addChild(this.effectLayer);
  }

  getTileLayer(): pc.Entity {
    return this.tileLayer;
  }

  getUnitLayer(): pc.Entity {
    return this.unitLayer;
  }

  getEffectLayer(): pc.Entity {
    return this.effectLayer;
  }

  render(_camera: Camera): void {
  }

  clear(): void {
    while (this.tileLayer.children.length > 0) {
      this.tileLayer.children[0].destroy();
    }
    while (this.unitLayer.children.length > 0) {
      this.unitLayer.children[0].destroy();
    }
    while (this.effectLayer.children.length > 0) {
      this.effectLayer.children[0].destroy();
    }
  }
}

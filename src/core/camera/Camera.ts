import * as pc from 'playcanvas';

export class Camera {
  private app: pc.Application;
  private entity: pc.Entity;
  private readonly cameraHeight: number = 400;
  private readonly baseOrthoHeight: number = 340;
  private zoom: number = 1;
  private position: pc.Vec3 = new pc.Vec3(0, 0, 0);

  constructor(app: pc.Application) {
    this.app = app;
    this.entity = new pc.Entity('Camera');
    this.entity.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: this.baseOrthoHeight,
      nearClip: 0.1,
      farClip: 2000,
      clearColor: new pc.Color(0.08, 0.09, 0.11)
    });
    this.entity.setLocalPosition(0, this.cameraHeight, 0);
    this.entity.setLocalEulerAngles(-90, 0, 0);
    this.app.root.addChild(this.entity);
  }

  setPosition(x: number, y: number): void {
    this.position.set(x, 0, y);
    this.entity.setLocalPosition(x, this.cameraHeight, y);
  }

  getPosition(): pc.Vec3 {
    return new pc.Vec3(this.position.x, this.position.z, 0);
  }

  setZoom(value: number): void {
    this.zoom = Math.max(0.5, Math.min(3, value));
    if (this.entity.camera) {
      this.entity.camera.orthoHeight = this.baseOrthoHeight / this.zoom;
    }
  }

  getZoom(): number {
    return this.zoom;
  }

  screenToWorld(screenX: number, screenY: number): pc.Vec3 {
    const canvas = this.app.graphicsDevice.canvas;
    const rect = canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    const worldPos = new pc.Vec3();
    if (this.entity.camera) {
      this.entity.camera.screenToWorld(x, y, this.cameraHeight, worldPos);
    }
    return worldPos;
  }

  worldToScreen(worldPos: pc.Vec3): { x: number; y: number } {
    let screenPos = new pc.Vec3();
    if (this.entity.camera) {
      screenPos = this.entity.camera.worldToScreen(worldPos, new pc.Vec3());
    }
    return {
      x: screenPos.x,
      y: screenPos.y
    };
  }
}

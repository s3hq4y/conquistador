import { GameSystem } from './GameSystem';
import type { GameEngine } from '../engine';

export class CameraControlSystem extends GameSystem {
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    this.setupInputListeners();
  }

  update(_dt: number): void {
  }

  dispose(): void {
  }

  private setupInputListeners(): void {
    const eventBus = this.engine.getEventBus();

    eventBus.on('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    eventBus.on('mouseup', () => {
      this.isDragging = false;
    });

    eventBus.on('mousemove', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;

        const camera = this.engine.getCamera();
        const pos = camera.getPosition();
        const zoom = camera.getZoom();

        // Reverse vertical movement direction: moving mouse up should move camera down
        camera.setPosition(pos.x - dx / zoom, pos.y - dy / zoom);

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    eventBus.on('wheel', (...args: unknown[]) => {
      const e = args[0] as WheelEvent;
      const camera = this.engine.getCamera();
      const zoom = camera.getZoom();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      camera.setZoom(zoom + delta);
    });
  }
}

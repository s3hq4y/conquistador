import * as pc from 'playcanvas';
import { Renderer } from './Renderer';
import { Camera } from '../camera';
import { InputManager } from '../common';
import { EventBus } from '../common';
import { GameSystem } from '../systems';

export class GameEngine {
  private app: pc.Application;
  private renderer: Renderer;
  private camera: Camera;
  private input: InputManager;
  private eventBus: EventBus;
  private readonly onResize: () => void;

  private systems: GameSystem[] = [];
  private isRunning: boolean = false;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.app = new pc.Application(canvas, {
      graphicsDeviceOptions: {
        alpha: false,
        antialias: true,
        depth: true,
        stencil: true
      }
    });
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.onResize = () => this.app.resizeCanvas();
    window.addEventListener('resize', this.onResize);
    this.app.resizeCanvas();

    this.eventBus = new EventBus();
    this.renderer = new Renderer(this.app);
    this.camera = new Camera(this.app);
    this.input = new InputManager(this.app, this.eventBus);

    this.initSystems();
  }

  private initSystems(): void {
    this.systems = [];
  }

  addSystem(system: GameSystem): void {
    this.systems.push(system);
    system.initialize();
  }

  start(): void {
    this.isRunning = true;
    this.app.start();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    window.removeEventListener('resize', this.onResize);
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = this.lastTime > 0 ? (now - this.lastTime) / 1000 : 0;
    this.lastTime = now;

    this.update(dt);

    requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number): void {
    this.input.update(dt);
    this.systems.forEach(sys => sys.update(dt));
    this.eventBus.flush();
  }

  getApplication(): pc.Application {
    return this.app;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  getCamera(): Camera {
    return this.camera;
  }

  getInput(): InputManager {
    return this.input;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getSystems(): GameSystem[] {
    return this.systems;
  }
}

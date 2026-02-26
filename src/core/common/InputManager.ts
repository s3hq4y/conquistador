import * as pc from 'playcanvas';
import { EventBus } from './EventBus';

export class InputManager {
  private app: pc.Application;
  private eventBus: EventBus;
  private mousePosition: pc.Vec2 = new pc.Vec2(0, 0);
  private mouseDown: boolean = false;
  private mouseButton: number = 0;
  private keys: Set<string> = new Set();
  private initialized: boolean = false;

  constructor(app: pc.Application, eventBus: EventBus) {
    this.app = app;
    this.eventBus = eventBus;
    this.init();
  }

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const canvas = this.app.graphicsDevice.canvas;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onMouseDown(e: MouseEvent): void {
    this.mouseDown = true;
    this.mouseButton = e.button;
    this.eventBus.emit('mousedown', e);
  }

  private onMouseUp(e: MouseEvent): void {
    this.mouseDown = false;
    this.eventBus.emit('mouseup', e);
  }

  private onMouseMove(e: MouseEvent): void {
    this.mousePosition.set(e.clientX, e.clientY);
    this.eventBus.emit('mousemove', e);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.eventBus.emit('wheel', e);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key);
    this.eventBus.emit('keydown', e);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key);
    this.eventBus.emit('keyup', e);
  }

  getMousePosition(): pc.Vec2 {
    return this.mousePosition.clone();
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  getMouseButton(): number {
    return this.mouseButton;
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }

  update(_dt: number): void {
  }
}

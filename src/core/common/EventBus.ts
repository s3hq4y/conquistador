import EventEmitter from 'eventemitter3';

type EventHandler = (...args: unknown[]) => void;

export class EventBus {
  private emitter: EventEmitter;
  private eventQueue: Array<{ event: string; args: unknown[] }> = [];

  constructor() {
    this.emitter = new EventEmitter();
  }

  on(event: string, handler: EventHandler): void {
    this.emitter.on(event, handler as any);
  }

  off(event: string, handler: EventHandler): void {
    this.emitter.off(event, handler as any);
  }

  emit(event: string, ...args: unknown[]): void {
    this.eventQueue.push({ event, args });
  }

  flush(): void {
    for (const { event, args } of this.eventQueue) {
      this.emitter.emit(event, ...args);
    }
    this.eventQueue.length = 0;
  }
}

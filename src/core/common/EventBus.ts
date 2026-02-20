type EventHandler = (...args: unknown[]) => void;

export class EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();
  private eventQueue: Array<{ event: string; args: unknown[] }> = [];

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    this.eventQueue.push({ event, args });
    window.dispatchEvent(new CustomEvent(event, { detail: args }));
  }

  flush(): void {
    for (const { event, args } of this.eventQueue) {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.forEach(handler => handler(...args));
      }
    }
    this.eventQueue.length = 0;
  }
}

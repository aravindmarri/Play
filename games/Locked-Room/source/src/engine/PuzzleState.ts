export type Step = { id: string; requirements: string[]; unlock: string };
export class EventBus {
  private listeners = new Set<(event: string) => void>();
  on(listener: (event: string) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(event: string) { this.listeners.forEach(listener => listener(event)); }
}
export class PuzzleState {
  readonly bus = new EventBus();
  readonly flags: Set<string>;
  constructor(readonly graph: Step[], flags: string[] = []) { this.flags = new Set(flags); this.resolve(); }
  has(flag: string) { return this.flags.has(flag); }
  set(flag: string) { if (this.has(flag)) return; this.flags.add(flag); this.resolve(); this.bus.emit(flag); }
  private resolve() {
    let changed = true;
    while (changed) { changed = false; for (const step of this.graph) if (!this.has(step.unlock) && step.requirements.every(f => this.has(f))) { this.flags.add(step.unlock); changed = true; } }
  }
  done() { return this.graph.filter(step => this.has(step.unlock)).map(step => step.id); }
  next() { return this.graph.find(step => !this.has(step.unlock)); }
}

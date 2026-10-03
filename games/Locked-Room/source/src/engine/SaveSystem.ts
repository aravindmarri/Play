export type QualityTier = 'auto' | 'low' | 'medium' | 'high';
export type Settings = { quality: QualityTier; volume: number; muted: boolean; invert: boolean; reduced: boolean; captions: boolean };
export type RoomSave = { flags: string[]; inventory: string[]; seconds: number; hints: number; hintDepth: Record<string, number>; dials: number[]; heat: number };
export type SaveData = { version: 1; solved: number[]; rooms: Record<number, RoomSave>; settings: Settings };
export const emptyRoom = (): RoomSave => ({ flags: [], inventory: [], seconds: 0, hints: 0, hintDepth: {}, dials: [0, 0, 0, 0], heat: 0 });
export function defaults(): SaveData { return { version: 1, solved: [], rooms: {}, settings: { quality: 'auto', volume: .45, muted: false, invert: false, reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, captions: true } }; }
export class SaveSystem {
  data = defaults();
  static key = 'aravind.locked-room.v1';
  constructor() {
    try {
      const value = JSON.parse(localStorage.getItem(SaveSystem.key) || 'null');
      if (value?.version === 1) {
        this.data.solved = Array.isArray(value.solved) ? value.solved.filter((x: unknown) => Number.isInteger(x) && Number(x) > 0) : [];
        const settings = value.settings || {};
        for (const key of ['muted','invert','reduced','captions'] as const) if (typeof settings[key] === 'boolean') this.data.settings[key] = settings[key];
        if (['auto','low','medium','high'].includes(settings.quality)) this.data.settings.quality = settings.quality;
        if (Number.isFinite(settings.volume)) this.data.settings.volume = Math.max(0, Math.min(1, settings.volume));
        if (value.rooms && typeof value.rooms === 'object') for (const [id, room] of Object.entries(value.rooms)) {
          const r = room as Partial<RoomSave>;
          if (!r || !Array.isArray(r.flags) || !Array.isArray(r.inventory)) continue;
          this.data.rooms[Number(id)] = { ...emptyRoom(), flags: r.flags.filter(f => typeof f === 'string'), inventory: r.inventory.filter(i => typeof i === 'string'), seconds: Math.max(0, Number(r.seconds) || 0), hints: Math.max(0, Number(r.hints) || 0), hintDepth: r.hintDepth && typeof r.hintDepth === 'object' ? r.hintDepth : {}, dials: Array.isArray(r.dials) && r.dials.length === 4 ? r.dials.map(x => Math.max(0, Math.min(9, Math.round(Number(x) || 0)))) : [0,0,0,0], heat: Math.max(0, Math.min(1, Number(r.heat) || 0)) };
        }
      }
    } catch { /* Storage is optional, including malformed saves. */ }
  }
  write() { try { localStorage.setItem(SaveSystem.key, JSON.stringify(this.data)); } catch { /* Private/blocked storage keeps the session playable. */ } }
  room(id: number) { return this.data.rooms[id] ??= emptyRoom(); }
  unlocked(id: number) { return id === 1 || this.data.solved.includes(id - 1); }
  complete(id: number) { if (!this.data.solved.includes(id)) this.data.solved.push(id); this.write(); }
  restart(id: number) { this.data.rooms[id] = emptyRoom(); this.write(); }
}

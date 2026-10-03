export const items: Record<string, { name: string; glyph: string; description: string }> = {
  matches: { name: 'Matchbox', glyph: '▤', description: 'A dry matchbox. Strike one along its rough edge.' },
  letter: { name: 'Elias’s letter', glyph: '✉', description: 'The light remembers what the ink forgets. The sea keeps the safe. — E.V.' },
  match: { name: 'Lit match', glyph: '♨', description: 'A small flame. Use it on the candelabra.' },
  key: { name: 'Iron key', glyph: '⚿', description: 'Heavy, cold iron. The teeth match the oak door.' },
  envelope: { name: 'Sealed envelope', glyph: 'Ⅱ', description: 'To be opened in the Clock Tower.' },
};
export class Inventory {
  selected: string | null = null;
  contents: Set<string>;
  constructor(saved: string[], private changed: () => void) { this.contents = new Set(saved.filter(id => id in items)); }
  add(id: string) { this.contents.add(id); this.changed(); }
  remove(id: string) { this.contents.delete(id); if (this.selected === id) this.selected = null; this.changed(); }
  select(id: string) { this.selected = this.selected === id ? null : id; this.changed(); }
  has(id: string) { return this.contents.has(id); }
}

import type { PuzzleState } from './PuzzleState';
export class HintSystem {
  constructor(private puzzle: PuzzleState, private hints: Record<string, string[]>, readonly depth: Record<string, number>) {}
  next() {
    const step = this.puzzle.next();
    if (!step) return 'The night has given up its last secret.';
    const choices = this.hints[step.id] || ['Look a little closer.'];
    const index = Math.min(Number(this.depth[step.id]) || 0, choices.length - 1);
    this.depth[step.id] = index + 1;
    return choices[index];
  }
}

type Tween = { elapsed: number; duration: number; update: (t: number) => void; done: () => void };
export class Motion {
  reduced = false;
  private tasks: Tween[] = [];
  to(seconds: number, update: (t: number) => void): Promise<void> {
    return new Promise(done => this.tasks.push({ elapsed: 0, duration: this.reduced ? Math.min(.16, seconds) : seconds, update, done }));
  }
  tick(dt: number) { for (const task of [...this.tasks]) { task.elapsed += dt; const t = Math.min(1, task.elapsed / task.duration); task.update(t * t * (3 - 2 * t)); if (t >= 1) { this.tasks.splice(this.tasks.indexOf(task), 1); task.done(); } } }
}

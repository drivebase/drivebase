/**
 * Async semaphore for bounding concurrency.
 * `acquire()` returns a release function; the caller MUST call it when done.
 */
export class Semaphore {
	private current = 0;
	private readonly waiters: Array<() => void> = [];

	constructor(private readonly max: number) {}

	async acquire(): Promise<() => void> {
		if (this.current < this.max) {
			this.current++;
			return this.createRelease();
		}

		return new Promise<() => void>((resolve) => {
			this.waiters.push(() => {
				this.current++;
				resolve(this.createRelease());
			});
		});
	}

	private createRelease(): () => void {
		let released = false;
		return () => {
			if (released) return;
			released = true;
			this.current--;
			const next = this.waiters.shift();
			if (next) next();
		};
	}
}

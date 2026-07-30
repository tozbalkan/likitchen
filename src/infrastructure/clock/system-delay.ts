import type { DelayPort } from '../../application/ports/clock/delay-port';

export class SystemDelay implements DelayPort {
  sleep(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class FakeDelay implements DelayPort {
  readonly requestedDelays: number[] = [];

  sleep(ms: number): Promise<void> {
    this.requestedDelays.push(ms);
    return Promise.resolve();
  }
}

import type { ClockPort } from '../../application/ports/clock/clock-port';
import type { Instant } from '../../shared/types';

export class SystemClock implements ClockPort {
  now(): Instant {
    return new Date();
  }
}

export class FakeClock implements ClockPort {
  private currentInstant: Instant;

  constructor(initialInstant?: Instant) {
    this.currentInstant =
      initialInstant ?? new Date('2026-07-30T12:00:00.000Z');
  }

  now(): Instant {
    return new Date(this.currentInstant.getTime());
  }

  setSystemTime(instant: Instant): void {
    this.currentInstant = new Date(instant.getTime());
  }

  advanceByMs(ms: number): void {
    this.currentInstant = new Date(this.currentInstant.getTime() + ms);
  }
}

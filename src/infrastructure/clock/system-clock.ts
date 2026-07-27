import type { Clock } from '../../application/ports/clock';

export class SystemClock implements Clock {
  public now(): Readonly<Date> {
    return new Date();
  }
}

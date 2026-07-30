import type { Instant } from '../../../shared/types';

export interface ClockPort {
  now(): Instant;
}

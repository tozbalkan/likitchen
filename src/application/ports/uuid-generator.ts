import type { Uuid } from '../../shared';

export interface UuidGenerator {
  generate(): Uuid;
}

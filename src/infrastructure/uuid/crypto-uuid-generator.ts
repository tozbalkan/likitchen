import { randomUUID } from 'crypto';
import type { UuidGenerator } from '../../application/ports/uuid-generator';
import type { Uuid } from '../../shared';

export class CryptoUuidGenerator implements UuidGenerator {
  public generate(): Uuid {
    return randomUUID() as Uuid;
  }
}

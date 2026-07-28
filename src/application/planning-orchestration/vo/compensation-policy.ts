export type CompensationPolicyType =
  'IDEMPOTENT' | 'BEST_EFFORT' | 'REQUIRES_CONFIRMATION';

export class CompensationPolicy {
  constructor(public readonly type: CompensationPolicyType = 'IDEMPOTENT') {
    Object.freeze(this);
  }
}

export type SwarmFailureAction =
  'RETRY_AGENT' | 'QUORUM_DEGRADED_OK' | 'HALT_SWARM';

export interface SwarmFailurePolicyProps {
  readonly maxAgentAttempts?: number | undefined;
  readonly failureAction?: SwarmFailureAction | undefined;
}

export class SwarmFailurePolicy {
  readonly maxAgentAttempts: number;
  readonly failureAction: SwarmFailureAction;

  private constructor(props: Readonly<SwarmFailurePolicyProps>) {
    const maxAttempts = props.maxAgentAttempts ?? 2;
    if (maxAttempts < 1) {
      throw new Error(
        '[SwarmFailurePolicy] maxAgentAttempts must be at least 1.',
      );
    }

    this.maxAgentAttempts = maxAttempts;
    this.failureAction = props.failureAction ?? 'QUORUM_DEGRADED_OK';
    Object.freeze(this);
  }

  static default(): SwarmFailurePolicy {
    return new SwarmFailurePolicy({});
  }

  static create(props: Readonly<SwarmFailurePolicyProps>): SwarmFailurePolicy {
    return new SwarmFailurePolicy(props);
  }
}

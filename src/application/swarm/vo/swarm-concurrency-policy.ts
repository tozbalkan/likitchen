export interface SwarmConcurrencyPolicyProps {
  readonly maxConcurrentAgents?: number | undefined;
  readonly swarmTimeoutMs?: number | undefined;
}

export class SwarmConcurrencyPolicy {
  readonly maxConcurrentAgents: number;
  readonly swarmTimeoutMs: number;

  private constructor(props: Readonly<SwarmConcurrencyPolicyProps>) {
    const maxAgents = props.maxConcurrentAgents ?? 4;
    const timeoutMs = props.swarmTimeoutMs ?? 30000;

    if (maxAgents < 1) {
      throw new Error(
        '[SwarmConcurrencyPolicy] maxConcurrentAgents must be at least 1.',
      );
    }
    if (timeoutMs < 100) {
      throw new Error(
        '[SwarmConcurrencyPolicy] swarmTimeoutMs must be at least 100ms.',
      );
    }

    this.maxConcurrentAgents = maxAgents;
    this.swarmTimeoutMs = timeoutMs;
    Object.freeze(this);
  }

  static default(): SwarmConcurrencyPolicy {
    return new SwarmConcurrencyPolicy({});
  }

  static create(
    props: Readonly<SwarmConcurrencyPolicyProps>,
  ): SwarmConcurrencyPolicy {
    return new SwarmConcurrencyPolicy(props);
  }
}

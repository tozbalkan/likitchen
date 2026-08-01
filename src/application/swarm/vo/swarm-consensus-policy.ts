export type SwarmFailureAction =
  'RETRY_AGENT' | 'QUORUM_DEGRADED_OK' | 'HALT_SWARM';

export interface SwarmConsensusPolicyProps {
  readonly minimumParticipants?: number | undefined;
  readonly minimumSuccessfulAgents?: number | undefined;
  readonly failureAction?: SwarmFailureAction | undefined;
}

export class SwarmConsensusPolicy {
  readonly minimumParticipants: number;
  readonly minimumSuccessfulAgents: number;
  readonly failureAction: SwarmFailureAction;

  private constructor(props: Readonly<SwarmConsensusPolicyProps>) {
    const minParticipants = props.minimumParticipants ?? 1;
    const minSuccessful = props.minimumSuccessfulAgents ?? 1;

    if (minParticipants < 1) {
      throw new Error(
        '[SwarmConsensusPolicy] minimumParticipants must be at least 1.',
      );
    }
    if (minSuccessful < 1) {
      throw new Error(
        '[SwarmConsensusPolicy] minimumSuccessfulAgents must be at least 1.',
      );
    }

    this.minimumParticipants = minParticipants;
    this.minimumSuccessfulAgents = minSuccessful;
    this.failureAction = props.failureAction ?? 'QUORUM_DEGRADED_OK';
    Object.freeze(this);
  }

  static default(): SwarmConsensusPolicy {
    return new SwarmConsensusPolicy({});
  }

  static create(
    props: Readonly<SwarmConsensusPolicyProps>,
  ): SwarmConsensusPolicy {
    return new SwarmConsensusPolicy(props);
  }
}

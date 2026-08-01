export interface SwarmConsensusResultProps {
  readonly finalOutput: string;
  readonly aggregatedConfidence: number;
  readonly participatingAgents: readonly string[];
}

export class SwarmConsensusResult {
  readonly finalOutput: string;
  readonly aggregatedConfidence: number;
  readonly participatingAgents: readonly string[];

  private constructor(props: Readonly<SwarmConsensusResultProps>) {
    if (props.aggregatedConfidence < 0.0 || props.aggregatedConfidence > 1.0) {
      throw new Error(
        '[SwarmConsensusResult] aggregatedConfidence must be between 0.0 and 1.0.',
      );
    }

    this.finalOutput = props.finalOutput ?? '';
    this.aggregatedConfidence = props.aggregatedConfidence;
    this.participatingAgents = Object.freeze([
      ...(props.participatingAgents ?? []),
    ]);
    Object.freeze(this);
  }

  static create(
    props: Readonly<SwarmConsensusResultProps>,
  ): SwarmConsensusResult {
    return new SwarmConsensusResult(props);
  }
}

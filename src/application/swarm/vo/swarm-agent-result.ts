export interface SwarmAgentResultProps {
  readonly agentId: string;
  readonly delegationIndex: number;
  readonly output: string;
  readonly confidenceScore: number;
}

export class SwarmAgentResult {
  readonly agentId: string;
  readonly delegationIndex: number;
  readonly output: string;
  readonly confidenceScore: number;

  private constructor(props: Readonly<SwarmAgentResultProps>) {
    if (!props.agentId || props.agentId.trim() === '') {
      throw new Error('[SwarmAgentResult] agentId is required.');
    }
    if (props.delegationIndex < 0) {
      throw new Error('[SwarmAgentResult] delegationIndex cannot be negative.');
    }
    if (props.confidenceScore < 0.0 || props.confidenceScore > 1.0) {
      throw new Error(
        '[SwarmAgentResult] confidenceScore must be between 0.0 and 1.0.',
      );
    }

    this.agentId = props.agentId;
    this.delegationIndex = props.delegationIndex;
    this.output = props.output ?? '';
    this.confidenceScore = props.confidenceScore;
    Object.freeze(this);
  }

  static create(props: Readonly<SwarmAgentResultProps>): SwarmAgentResult {
    return new SwarmAgentResult(props);
  }
}

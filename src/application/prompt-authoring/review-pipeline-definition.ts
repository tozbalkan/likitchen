export interface ReviewPipelineStep {
  readonly stepId: string;
  readonly name: string;
  readonly requiredRole: string;
}

export interface ReviewPipelineDefinitionProps {
  readonly id: string;
  readonly version: string;
  readonly steps: ReadonlyArray<ReviewPipelineStep>;
  readonly parallelSteps: boolean;
  readonly minimumApprovers: number;
  readonly approvalThresholdPercent: number;
}

export class ReviewPipelineDefinition {
  readonly id: string;
  readonly version: string;
  readonly steps: ReadonlyArray<ReviewPipelineStep>;
  readonly parallelSteps: boolean;
  readonly minimumApprovers: number;
  readonly approvalThresholdPercent: number;

  constructor(props: ReviewPipelineDefinitionProps) {
    this.id = props.id;
    this.version = props.version;
    this.steps = Object.freeze([...props.steps]);
    this.parallelSteps = props.parallelSteps;
    this.minimumApprovers = props.minimumApprovers;
    this.approvalThresholdPercent = props.approvalThresholdPercent;
    Object.freeze(this);
  }

  static createDefault(): ReviewPipelineDefinition {
    return new ReviewPipelineDefinition({
      id: 'default-review-pipeline',
      version: '1.0.0',
      steps: [
        {
          stepId: 'step-tech',
          name: 'Tech Review',
          requiredRole: 'Prompt.Review',
        },
        {
          stepId: 'step-sec',
          name: 'Security Review',
          requiredRole: 'Prompt.Admin',
        },
      ],
      parallelSteps: false,
      minimumApprovers: 1,
      approvalThresholdPercent: 100,
    });
  }
}

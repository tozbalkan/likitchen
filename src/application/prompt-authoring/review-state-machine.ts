import { PromptWorkspace } from './prompt-workspace';
import { ReviewPipelineDefinition } from './review-pipeline-definition';

export interface ReviewDecision {
  readonly stepId: string;
  readonly reviewerId: string;
  readonly approved: boolean;
  readonly comments?: string | undefined;
  readonly decidedAt: Date;
}

export class ReviewStateMachine {
  constructor(private readonly definition: ReviewPipelineDefinition) {}

  canTransitionToInReview(workspace: Readonly<PromptWorkspace>): boolean {
    return workspace.lifecycle === 'ACTIVE';
  }

  evaluateApproval(
    workspace: Readonly<PromptWorkspace>,
    decisions: ReadonlyArray<ReviewDecision>,
  ): 'IN_REVIEW' | 'APPROVED' | 'REJECTED' {
    if (workspace.lifecycle !== 'IN_REVIEW') {
      return workspace.lifecycle === 'APPROVED' ? 'APPROVED' : 'IN_REVIEW';
    }

    const rejections = decisions.filter((d) => !d.approved);
    if (rejections.length > 0) {
      return 'REJECTED';
    }

    const approvals = decisions.filter((d) => d.approved);
    const approvedSteps = new Set(approvals.map((a) => a.stepId));

    const allStepsApproved = this.definition.steps.every((s) =>
      approvedSteps.has(s.stepId),
    );
    if (
      allStepsApproved &&
      approvals.length >= this.definition.minimumApprovers
    ) {
      return 'APPROVED';
    }

    return 'IN_REVIEW';
  }
}

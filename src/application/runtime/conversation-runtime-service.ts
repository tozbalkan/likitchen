import type { RuntimeEngine } from '../../domain/conversation/runtime/runtime-engine';
import type { RuntimeEvent } from '../../domain/conversation/runtime/types';
import type { RuntimeLockManager } from './runtime-lock-manager';
import type { ConversationExecutionContext } from './conversation-execution-context';
import type { DecisionOrchestrator } from '../orchestration/decision-orchestrator';
import type { RecommendationEngine } from '../../domain/conversation/recommendation/recommendation-engine';
import type { ProcessContext } from '../../shared/types';
import type { ExecutionReport } from '../orchestration/types';
import type { ConversationFacts } from '../../domain/conversation/conversation-facts';
import type { ConversationAssessment } from '../../domain/conversation/recommendation';
import type { PolicyEvaluationReport } from '../../domain/conversation/policy/pipeline/policy-evaluation-report';

export interface RuntimeRepositoryPort {
  loadContext(sessionId: string): Promise<ConversationExecutionContext | null>;
  saveContext(context: ConversationExecutionContext): Promise<void>;
}

export interface RuntimeProcessResult {
  readonly status: 'executed' | 'rejected' | 'duplicate' | 'stale' | 'locked';
  readonly executionReport?: ExecutionReport;
  readonly reason: string;
}

export interface PipelineEvaluationOutput {
  readonly facts: ConversationFacts;
  readonly assessment: ConversationAssessment;
  readonly policyReport: PolicyEvaluationReport;
}

export class ConversationRuntimeService {
  constructor(
    private readonly runtimeEngine: RuntimeEngine,
    private readonly lockManager: RuntimeLockManager,
    private readonly repository: RuntimeRepositoryPort,
    private readonly recommendationEngine: RecommendationEngine,
    private readonly orchestrator: DecisionOrchestrator,
  ) {}

  async handleEvent(
    sessionId: string,
    event: Readonly<RuntimeEvent>,
    processContext: Readonly<ProcessContext>,
    pipelineEvaluator: (
      context: ConversationExecutionContext,
    ) => Promise<PipelineEvaluationOutput>,
  ): Promise<RuntimeProcessResult> {
    const lockResult = await this.lockManager.withLock(
      sessionId,
      5000,
      async () => {
        const activeContext = await this.repository.loadContext(sessionId);
        if (!activeContext) {
          return {
            status: 'rejected' as const,
            reason: 'Session execution context not found.',
          };
        }

        // FSM Evaluation
        const evaluation = this.runtimeEngine.evaluate(
          activeContext.state,
          activeContext.revision,
          event,
        );

        if (!evaluation.canProcess) {
          let statusResult: RuntimeProcessResult['status'] = 'rejected';
          if (evaluation.isDuplicate) statusResult = 'duplicate';
          if (evaluation.isStale) statusResult = 'stale';

          return {
            status: statusResult,
            reason: evaluation.reason,
          };
        }

        // Run extraction / policy pipeline
        const pipelineResult = await pipelineEvaluator(activeContext);

        // Generate recommendation
        const recommendationDecision = this.recommendationEngine.evaluate({
          facts: pipelineResult.facts,
          assessment: pipelineResult.assessment,
          policyReport: pipelineResult.policyReport,
        });

        // Orchestrate decision
        const executionReport = await this.orchestrator.execute(
          recommendationDecision,
          processContext,
        );

        // Update session execution context
        const newRevisionNumber =
          event.type === 'UserMessageReceived'
            ? event.revisionNumber
            : activeContext.revision.revisionNumber;
        const newNextMessageId =
          event.type === 'UserMessageReceived'
            ? event.messageId
            : activeContext.revision.messageId;

        const updatedContext: ConversationExecutionContext = {
          ...activeContext,
          state: evaluation.nextState,
          revision: {
            revisionNumber: newRevisionNumber,
            messageId: newNextMessageId,
          },
        };

        await this.repository.saveContext(updatedContext);

        return {
          status: 'executed' as const,
          executionReport,
          reason: evaluation.reason,
        };
      },
    );

    if (!lockResult) {
      return {
        status: 'locked',
        reason: 'Execution locked due to concurrent processing.',
      };
    }

    return lockResult;
  }
}

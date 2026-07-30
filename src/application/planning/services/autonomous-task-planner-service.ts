import type {
  TaskPlannerPort,
  PlanExecutionResult,
} from '../ports/task-planner-port';
import type { ReasoningEnginePort } from '../../agent/ports/reasoning-engine-port';
import type { TenantContext } from '../../identity/tenant-context';
import { AutonomousPlan } from '../vo/autonomous-plan';
import { SubGoalNode } from '../vo/sub-goal-node';
import {
  PlanExecutionCursor,
  type SubGoalStatus,
} from '../vo/plan-execution-cursor';
import { SubGoalExecutionRequest } from '../vo/sub-goal-execution-request';
import {
  PlannerBudgetPolicy,
  type SubGoalFailureAction,
} from '../vo/planner-policy';
import { LLMRequest } from '../../agent/vo/llm-request';
import { LLMMessage } from '../../agent/vo/llm-message';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../../agent/vo/model-descriptor';

export interface AutonomousTaskPlannerServiceProps {
  readonly reasoningEngine: ReasoningEnginePort;
  readonly budgetPolicy?: PlannerBudgetPolicy | undefined;
}

export class AutonomousTaskPlannerService implements TaskPlannerPort {
  private readonly reasoningEngine: ReasoningEnginePort;
  private readonly budgetPolicy: PlannerBudgetPolicy;

  constructor(props: Readonly<AutonomousTaskPlannerServiceProps>) {
    if (!props.reasoningEngine) {
      throw new Error(
        '[AutonomousTaskPlannerService] reasoningEngine is required.',
      );
    }
    this.reasoningEngine = props.reasoningEngine;
    this.budgetPolicy = props.budgetPolicy ?? PlannerBudgetPolicy.default();
  }

  async createPlan(
    tenantContext: Readonly<TenantContext>,
    goalPrompt: string,
  ): Promise<AutonomousPlan> {
    if (!tenantContext || !tenantContext.tenantId) {
      throw new Error(
        '[AutonomousTaskPlannerService] Valid TenantContext is required.',
      );
    }
    if (!goalPrompt || goalPrompt.trim() === '') {
      throw new Error('[AutonomousTaskPlannerService] goalPrompt is required.');
    }

    // Initial plan decomposition
    const nodeA = SubGoalNode.create({
      subGoalId: 'sg-1',
      title: 'Analyze Task Requirements',
      objective: `Analyze goal requirements for: ${goalPrompt}`,
      isRequired: true,
    });

    const nodeB = SubGoalNode.create({
      subGoalId: 'sg-2',
      title: 'Execute Goal Action',
      objective: `Fulfill objective for: ${goalPrompt}`,
      isRequired: true,
      dependencies: ['sg-1'],
    });

    return AutonomousPlan.create({
      planId: `plan-${Date.now()}`,
      planVersion: 1,
      goalPrompt,
      nodes: [nodeA, nodeB],
    });
  }

  async executeStep(
    tenantContext: Readonly<TenantContext>,
    plan: AutonomousPlan,
    cursor: PlanExecutionCursor,
  ): Promise<PlanExecutionResult> {
    const nextNode = this.resolveNextSubGoalNode(plan, cursor);

    if (!nextNode) {
      const isCompleted = this.checkAllSubGoalsCompleted(plan, cursor);
      return {
        plan,
        cursor,
        isCompleted,
        isFailed: !isCompleted,
      };
    }

    // 1. Advance cursor snapshot to IN_PROGRESS
    const inProgressCursor = cursor.advance(nextNode.subGoalId, 'IN_PROGRESS');

    // 2. Build SubGoalExecutionRequest DTO
    const execRequest = SubGoalExecutionRequest.create({
      planId: plan.planId,
      planVersion: plan.planVersion,
      subGoalId: nextNode.subGoalId,
      prompt: nextNode.objective,
      tenantContext,
    });

    // 3. Delegate execution strictly to Capability-027 ReasoningEnginePort.executeCycle
    const defaultModel = ModelDescriptor.create({
      providerId: 'openai' as ProviderId,
      modelId: 'gpt-4o' as ModelId,
    });

    const llmRequest = LLMRequest.create({
      model: defaultModel,
      messages: [LLMMessage.fromText('user', execRequest.prompt)],
    });

    try {
      const result = await this.reasoningEngine.executeCycle(
        tenantContext,
        llmRequest,
      );

      if (result.finishReason === 'COMPLETED') {
        const completedCursor = inProgressCursor.advance(
          nextNode.subGoalId,
          'COMPLETED',
        );
        const isCompleted = this.checkAllSubGoalsCompleted(
          plan,
          completedCursor,
        );
        return {
          plan,
          cursor: completedCursor,
          isCompleted,
          isFailed: false,
          activeSubGoalId: nextNode.subGoalId,
        };
      } else {
        return this.handleSubGoalFailure(
          tenantContext,
          plan,
          inProgressCursor,
          nextNode,
        );
      }
    } catch {
      return this.handleSubGoalFailure(
        tenantContext,
        plan,
        inProgressCursor,
        nextNode,
      );
    }
  }

  async replan(
    tenantContext: Readonly<TenantContext>,
    failedPlan: AutonomousPlan,
    cursor: PlanExecutionCursor,
    failedSubGoalId: string,
  ): Promise<AutonomousPlan> {
    if (!this.budgetPolicy.canReplan(failedPlan.planVersion)) {
      throw new Error(
        `[AutonomousTaskPlannerService] Replanning budget exceeded. Max plan versions: ${this.budgetPolicy.maxPlanVersions}.`,
      );
    }

    const nextVersion = failedPlan.planVersion + 1;
    const replacementNode = SubGoalNode.create({
      subGoalId: `${failedSubGoalId}-revised`,
      title: `Revised ${failedSubGoalId}`,
      objective: `Revised objective for ${failedSubGoalId} in plan version ${nextVersion}`,
      isRequired: true,
    });

    const survivingNodes = failedPlan.nodes.filter(
      (n) => cursor.getStatus(n.subGoalId) === 'COMPLETED',
    );

    return AutonomousPlan.create({
      planId: failedPlan.planId,
      planVersion: nextVersion,
      parentPlanVersion: failedPlan.planVersion,
      goalPrompt: failedPlan.goalPrompt,
      nodes: [...survivingNodes, replacementNode],
    });
  }

  private handleSubGoalFailure(
    tenantContext: Readonly<TenantContext>,
    plan: AutonomousPlan,
    cursor: PlanExecutionCursor,
    failedNode: Readonly<SubGoalNode>,
  ): PlanExecutionResult {
    let failureAction: SubGoalFailureAction = 'HALT_PLAN';

    if (!failedNode.isRequired) {
      failureAction = 'SKIP_OPTIONAL';
    } else if (this.budgetPolicy.canReplan(plan.planVersion)) {
      failureAction = 'REPLAN';
    }

    if (failureAction === 'SKIP_OPTIONAL') {
      const skippedCursor = cursor.advance(failedNode.subGoalId, 'SKIPPED');
      const isCompleted = this.checkAllSubGoalsCompleted(plan, skippedCursor);
      return {
        plan,
        cursor: skippedCursor,
        isCompleted,
        isFailed: false,
        activeSubGoalId: failedNode.subGoalId,
        lastAction: 'SKIP_OPTIONAL',
      };
    }

    const failedCursor = cursor.advance(failedNode.subGoalId, 'FAILED');
    return {
      plan,
      cursor: failedCursor,
      isCompleted: false,
      isFailed: true,
      activeSubGoalId: failedNode.subGoalId,
      lastAction: failureAction,
    };
  }

  private resolveNextSubGoalNode(
    plan: AutonomousPlan,
    cursor: PlanExecutionCursor,
  ): SubGoalNode | undefined {
    for (const node of plan.nodes) {
      const status = cursor.getStatus(node.subGoalId);
      if (status === 'PENDING') {
        const depsSatisfied = node.dependencies.every((depId) => {
          const depStatus = cursor.getStatus(depId);
          return depStatus === 'COMPLETED' || depStatus === 'SKIPPED';
        });

        if (depsSatisfied) {
          return node;
        }
      }
    }
    return undefined;
  }

  private checkAllSubGoalsCompleted(
    plan: AutonomousPlan,
    cursor: PlanExecutionCursor,
  ): boolean {
    return plan.nodes.every((node) => {
      const status = cursor.getStatus(node.subGoalId);
      if (node.isRequired) {
        return status === 'COMPLETED';
      }
      return status === 'COMPLETED' || status === 'SKIPPED';
    });
  }
}

import type {
  SwarmOrchestratorPort,
  SwarmTaskRequest,
  SwarmOrchestrationOptions,
} from '../ports/swarm-orchestrator-port';
import type { ReasoningEnginePort } from '../../agent/ports/reasoning-engine-port';
import type { TenantContext } from '../../identity/tenant-context';
import { SwarmAgentResult } from '../vo/swarm-agent-result';
import { SwarmConsensusResult } from '../vo/swarm-consensus-result';
import { SwarmConcurrencyPolicy } from '../vo/swarm-concurrency-policy';
import { SwarmConsensusPolicy } from '../vo/swarm-consensus-policy';
import { SwarmFailurePolicy } from '../vo/swarm-failure-policy';
import { LLMRequest } from '../../agent/vo/llm-request';
import { LLMMessage } from '../../agent/vo/llm-message';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../../agent/vo/model-descriptor';

export interface SwarmOrchestratorServiceProps {
  readonly reasoningEngine: ReasoningEnginePort;
}

export class SwarmOrchestratorService implements SwarmOrchestratorPort {
  private readonly reasoningEngine: ReasoningEnginePort;

  constructor(props: Readonly<SwarmOrchestratorServiceProps>) {
    if (!props.reasoningEngine) {
      throw new Error(
        '[SwarmOrchestratorService] reasoningEngine is required.',
      );
    }
    this.reasoningEngine = props.reasoningEngine;
  }

  async orchestrateSwarm(
    tenantContext: TenantContext,
    request: SwarmTaskRequest,
    options?: SwarmOrchestrationOptions,
  ): Promise<SwarmConsensusResult> {
    if (!tenantContext || !tenantContext.tenantId) {
      throw new Error(
        '[SwarmOrchestratorService] Valid TenantContext is required.',
      );
    }
    if (!request || !request.tasks || request.tasks.length === 0) {
      throw new Error(
        '[SwarmOrchestratorService] At least one SwarmTaskNode is required.',
      );
    }

    const concurrencyPolicy =
      request.concurrencyPolicy ?? SwarmConcurrencyPolicy.default();
    const consensusPolicy =
      request.consensusPolicy ?? SwarmConsensusPolicy.default();
    const failurePolicy = request.failurePolicy ?? SwarmFailurePolicy.default();

    // Cascading Cancellation Controller
    const abortController = new AbortController();
    if (options?.signal) {
      if (options.signal.aborted) {
        abortController.abort();
      } else {
        options.signal.addEventListener(
          'abort',
          () => abortController.abort(),
          { once: true },
        );
      }
    }

    // Outer timeout timer
    const timerId = setTimeout(() => {
      abortController.abort();
    }, concurrencyPolicy.swarmTimeoutMs);

    try {
      // Invocation-scoped execution state
      const taskStatuses = new Map<
        string,
        'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
      >();
      const resultsMap = new Map<string, SwarmAgentResult>();
      const attemptsMap = new Map<string, number>();

      for (const t of request.tasks) {
        taskStatuses.set(t.taskId, 'PENDING');
        attemptsMap.set(t.taskId, 0);
      }

      // Execute DAG batches under hard concurrency limits
      while (this.hasUnfinishedTasks(taskStatuses)) {
        if (abortController.signal.aborted) {
          throw new Error(
            '[SwarmOrchestratorService] Swarm execution cancelled or timed out.',
          );
        }

        const readyTasks = request.tasks.filter((t) => {
          if (taskStatuses.get(t.taskId) !== 'PENDING') return false;
          const deps = t.dependencies ?? [];
          return deps.every((depId) => taskStatuses.get(depId) === 'COMPLETED');
        });

        if (readyTasks.length === 0 && this.hasUnfinishedTasks(taskStatuses)) {
          // Check if deadlocked by failed dependencies
          const anyRunning = Array.from(taskStatuses.values()).includes(
            'RUNNING',
          );
          if (!anyRunning) {
            break; // Unsatisfiable dependencies
          }
        }

        // Throttle to hard concurrency limit
        const batch = readyTasks.slice(
          0,
          concurrencyPolicy.maxConcurrentAgents,
        );
        for (const task of batch) {
          taskStatuses.set(task.taskId, 'RUNNING');
        }

        // Execute batch in parallel
        await Promise.all(
          batch.map(async (task, idx) => {
            const delegationIndex = request.tasks.findIndex(
              (t) => t.taskId === task.taskId,
            );
            const currentAttempt = (attemptsMap.get(task.taskId) ?? 0) + 1;
            attemptsMap.set(task.taskId, currentAttempt);

            try {
              const agentResult = await this.executeSingleAgentTask(
                tenantContext,
                task,
                delegationIndex,
                abortController.signal,
              );
              resultsMap.set(task.taskId, agentResult);
              taskStatuses.set(task.taskId, 'COMPLETED');
            } catch (err: unknown) {
              const isAborted =
                abortController.signal.aborted ||
                (err instanceof Error && err.name === 'AbortError');
              if (isAborted) {
                taskStatuses.set(task.taskId, 'FAILED');
                return;
              }

              // Evaluate Agent Retry Budget
              if (
                failurePolicy.failureAction === 'RETRY_AGENT' &&
                currentAttempt < failurePolicy.maxAgentAttempts
              ) {
                taskStatuses.set(task.taskId, 'PENDING'); // Queue for retry
              } else {
                taskStatuses.set(task.taskId, 'FAILED');
              }
            }
          }),
        );
      }

      if (abortController.signal.aborted) {
        throw new Error(
          '[SwarmOrchestratorService] Swarm execution cancelled or timed out.',
        );
      }

      // Sort results by delegationIndex canonical order
      const sortedResults = Array.from(resultsMap.values()).sort(
        (a, b) => a.delegationIndex - b.delegationIndex,
      );

      const successfulCount = sortedResults.length;
      if (successfulCount < consensusPolicy.minimumSuccessfulAgents) {
        if (failurePolicy.failureAction === 'HALT_SWARM') {
          throw new Error(
            `[SwarmOrchestratorService] Swarm failed to reach minimum successful agents: ${consensusPolicy.minimumSuccessfulAgents}.`,
          );
        }
      }

      // Compute deterministic consensus aggregation
      const finalOutput = sortedResults
        .map((r) => `[${r.agentId}]: ${r.output}`)
        .join('\n\n');
      const avgConfidence =
        sortedResults.length > 0
          ? sortedResults.reduce((acc, r) => acc + r.confidenceScore, 0) /
            sortedResults.length
          : 0.0;

      return SwarmConsensusResult.create({
        finalOutput,
        aggregatedConfidence: Math.min(1.0, Math.max(0.0, avgConfidence)),
        participatingAgents: sortedResults.map((r) => r.agentId),
      });
    } finally {
      clearTimeout(timerId);
    }
  }

  private async executeSingleAgentTask(
    tenantContext: TenantContext,
    task: import('../ports/swarm-orchestrator-port').SwarmTaskNode,
    delegationIndex: number,
    signal: AbortSignal,
  ): Promise<SwarmAgentResult> {
    if (signal.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }

    const defaultModel = ModelDescriptor.create({
      providerId: 'openai' as ProviderId,
      modelId: 'gpt-4o' as ModelId,
    });

    const llmRequest = LLMRequest.create({
      model: defaultModel,
      messages: [LLMMessage.fromText('user', task.prompt)],
    });

    const cycleResult = await this.reasoningEngine.executeCycle(
      tenantContext,
      llmRequest,
      {
        signal,
      },
    );

    if (signal.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }

    const responseText =
      cycleResult.finalResponse?.choices[0]?.message?.textContent ??
      'Task finished';

    return SwarmAgentResult.create({
      agentId: task.agent.agentId,
      delegationIndex,
      output: responseText,
      confidenceScore: 0.9, // Normalized score
    });
  }

  private hasUnfinishedTasks(
    statuses: Map<string, 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'>,
  ): boolean {
    return Array.from(statuses.values()).some(
      (s) => s === 'PENDING' || s === 'RUNNING',
    );
  }
}

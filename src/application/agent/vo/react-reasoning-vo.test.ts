import { describe, it, expect } from 'vitest';
import {
  createToolInvocationAction,
  createFinishAction,
} from './reasoning-action';
import { createTextObservationPayload } from './observation-payload';
import { Observation } from './observation';
import { ReasoningStep } from './reasoning-step';
import { ReActCycleResult } from './react-cycle-result';
import { ToolInvocation } from './tool-invocation';
import { ToolArguments } from './tool-arguments';
import type { ToolId } from './tool-definition';
import type { InvocationId } from './tool-invocation';
import type { ReasoningSessionId } from './react-cycle-result';
import type { CorrelationId } from '../../../shared/types';

describe('Capability-027 Iteration 3 Step 1 — ReAct Reasoning VOs & Actions', () => {
  const mockToolId = 'tool-calculator' as ToolId;
  const mockInvocationId = 'inv-001' as InvocationId;
  const mockCorrelationId = 'corr-001' as CorrelationId;
  const mockSessionId = 'session-react-100' as ReasoningSessionId;

  it('creates immutable ReasoningAction variants (ToolInvocationAction & FinishAction)', () => {
    const invocation = ToolInvocation.create({
      invocationId: mockInvocationId,
      toolId: mockToolId,
      arguments: ToolArguments.empty(),
      correlationId: mockCorrelationId,
    });

    const action = createToolInvocationAction(invocation);
    expect(action.type).toBe('tool_invocation');
    expect(action.invocation.toolId).toBe('tool-calculator');
    expect(Object.isFrozen(action)).toBe(true);

    const finishAction = createFinishAction();
    expect(finishAction.type).toBe('finish');
    expect(Object.isFrozen(finishAction)).toBe(true);
  });

  it('creates Observation with ObservationPayload VO', () => {
    const payload = createTextObservationPayload('Calculated result: 42');
    const obs = Observation.create({
      observationId: 'obs-001',
      toolId: mockToolId,
      invocationId: mockInvocationId,
      payload,
      executionTimeMs: 15,
    });

    expect(obs.isSuccess).toBe(true);
    expect(obs.payload.content).toBe('Calculated result: 42');
    expect(Object.isFrozen(obs)).toBe(true);
  });

  it('creates ReasoningStep and ReActCycleResult VOs', () => {
    const invocation = ToolInvocation.create({
      invocationId: mockInvocationId,
      toolId: mockToolId,
      arguments: ToolArguments.empty(),
      correlationId: mockCorrelationId,
    });

    const action = createToolInvocationAction(invocation);
    const step = ReasoningStep.create({
      stepIndex: 0,
      state: 'EXECUTING_TOOL',
      action,
    });

    expect(step.stepIndex).toBe(0);
    expect(step.state).toBe('EXECUTING_TOOL');
    expect(Object.isFrozen(step)).toBe(true);

    const result = ReActCycleResult.create({
      sessionId: mockSessionId,
      finishReason: 'COMPLETED',
      steps: [step],
      totalDurationMs: 120,
    });

    expect(result.isCompleted).toBe(true);
    expect(result.sessionId).toBe('session-react-100');
    expect(result.steps.length).toBe(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.steps)).toBe(true);
  });
});

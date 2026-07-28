import { describe, it, expect } from 'vitest';
import {
  ExecutionPipelineBuilder,
  PipelineValidationException,
} from './execution-pipeline';
import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from './execution-stage';
import { StageContext as StageContextClass } from './execution-stage';
import { CancellationToken } from './cancellation-token';
import { ExecutionContext } from '../context/execution-context';
import { TenantContext } from '../identity/tenant-context';

function createMockStage(
  name: string,
  status: StageResult['status'] = 'CONTINUE',
): ExecutionStage {
  return {
    name,
    async execute(context: Readonly<StageContext>): Promise<StageResult> {
      return {
        status,
        context,
        metadata: { executedBy: name },
      };
    },
  };
}

describe('ExecutionPipeline & ExecutionPipelineBuilder', () => {
  const dummyContext = StageContextClass.create({
    executionContext: ExecutionContext.create({
      correlationId: 'c1',
      traceId: 't1',
    }),
    tenantContext: TenantContext.create({
      tenantId: 't-1',
      organizationId: 'o-1',
      workspaceId: 'w-1',
      environment: 'test',
      region: 'us-east-1',
    }),
    cancellationToken: new CancellationToken(),
  });

  it('validates required stages and order on build()', () => {
    const builder = new ExecutionPipelineBuilder();

    // Empty -> fails
    expect(() => builder.build()).toThrow(PipelineValidationException);

    // Missing ContextStage -> fails
    builder.addStage(createMockStage('DispatchStage'));
    expect(() => builder.build()).toThrow('First stage must be ContextStage');
  });

  it('builds a valid pipeline when all rules are satisfied', () => {
    const pipeline = new ExecutionPipelineBuilder()
      .addStage(createMockStage('ContextStage'))
      .addStage(createMockStage('DispatchStage'))
      .addStage(createMockStage('TelemetryStage'))
      .build();

    expect(pipeline.stages).toHaveLength(3);
    expect(pipeline.stages[0]?.name).toBe('ContextStage');
    expect(pipeline.stages[1]?.name).toBe('DispatchStage');
    expect(pipeline.stages[2]?.name).toBe('TelemetryStage');
  });

  it('stops execution cleanly when a stage returns STOP status', async () => {
    const contextStage = createMockStage('ContextStage');
    const guardStage = createMockStage('GuardStage', 'STOP');
    const dispatchStage = createMockStage('DispatchStage');
    const telemetryStage = createMockStage('TelemetryStage');

    const pipeline = new ExecutionPipelineBuilder()
      .addStage(contextStage)
      .addStage(guardStage)
      .addStage(dispatchStage)
      .addStage(telemetryStage)
      .build();

    const result = await pipeline.execute(dummyContext);
    expect(result).toBeDefined();
  });

  it('throws when cancelled mid-pipeline', async () => {
    const token = new CancellationToken();
    token.cancel('User aborted');

    const cancelledContext = StageContextClass.create({
      executionContext: dummyContext.executionContext,
      tenantContext: dummyContext.tenantContext,
      cancellationToken: token,
    });

    const pipeline = new ExecutionPipelineBuilder()
      .addStage(createMockStage('ContextStage'))
      .addStage(createMockStage('DispatchStage'))
      .addStage(createMockStage('TelemetryStage'))
      .build();

    await expect(pipeline.execute(cancelledContext)).rejects.toThrow(
      'User aborted',
    );
  });
});

import { describe, it, expect, vi } from 'vitest';
import { ProcessUserMessageUseCase } from './process-user-message-use-case';
import { ok, err } from '../../../../shared/result';
import type { PipelineStep } from './steps/pipeline-step';
import type { ProcessContext, Uuid } from '../../../../shared/types';

describe('ProcessUserMessageUseCase', () => {
  const dummyContext: Readonly<ProcessContext> = {
    correlationId: 'corr-1' as never,
    traceId: 'trace-1' as never,
  };

  it('should short-circuit if a step fails', async () => {
    const step1: PipelineStep = {
      execute: vi.fn().mockResolvedValue(ok({ step1Run: true })),
    };
    const step2: PipelineStep = {
      execute: vi
        .fn()
        .mockResolvedValue(err({ code: 'TestError', message: 'Failed' })),
    };
    const step3: PipelineStep = {
      execute: vi.fn(),
    };

    const useCase = new ProcessUserMessageUseCase([step1, step2, step3]);

    const result = await useCase.execute(
      { conversationId: 'id-1' as Uuid, message: 'Hello', expectedRevision: 1 },
      dummyContext,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TestError');
    }

    expect(step1.execute).toHaveBeenCalledOnce();
    expect(step2.execute).toHaveBeenCalledOnce();
    expect(step3.execute).not.toHaveBeenCalled();
  });

  it('should map response correctly if pipeline completes', async () => {
    const step1: PipelineStep = {
      execute: vi.fn().mockResolvedValue(ok({ response: { success: true } })),
    };

    const useCase = new ProcessUserMessageUseCase([step1]);

    const result = await useCase.execute(
      { conversationId: 'id-1' as Uuid, message: 'Hello', expectedRevision: 1 },
      dummyContext,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ success: true });
    }
  });
});

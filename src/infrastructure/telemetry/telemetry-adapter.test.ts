import { describe, it, expect } from 'vitest';
import { SilentTelemetryAdapter } from './silent-telemetry-adapter';
import { ConsoleTelemetryAdapter } from './console-telemetry-adapter';
import { ExecutionContext } from '../../application/context/execution-context';

describe('Telemetry Adapters', () => {
  const context = ExecutionContext.create({
    correlationId: 'corr-123',
    traceId: 'trace-456',
    conversationId: 'conv-789',
  });

  it('SilentTelemetryAdapter records spans and metrics without side effects', async () => {
    const adapter = new SilentTelemetryAdapter();

    await adapter.withSpan(
      context,
      { name: 'test.span' },
      async () => 'result',
    );
    adapter.counter(context, { name: 'test.counter', value: 1 });

    expect(adapter.recordedSpans).toHaveLength(1);
    expect(adapter.recordedSpans[0]?.name).toBe('test.span');

    expect(adapter.recordedMetrics).toHaveLength(1);
    expect(adapter.recordedMetrics[0]?.name).toBe('test.counter');
  });

  it('ConsoleTelemetryAdapter executes function and returns value', async () => {
    const adapter = new ConsoleTelemetryAdapter();

    const value = await adapter.withSpan(
      context,
      { name: 'dev.span' },
      async () => 'hello',
    );
    expect(value).toBe('hello');
  });
});

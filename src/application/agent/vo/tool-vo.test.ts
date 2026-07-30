import { describe, it, expect } from 'vitest';
import { ToolSchema } from './tool-schema';
import { ToolArguments } from './tool-arguments';
import { ToolDefinition } from './tool-definition';
import { ToolInvocation } from './tool-invocation';
import { ToolResult } from './tool-result';
import { createToolCallPart, createToolResultPart } from './llm-content-part';
import {
  ToolExecutionError,
  ToolTimeoutError,
  ToolValidationError,
  ToolPermissionError,
  ToolUnavailableError,
} from '../errors/tool-execution-error';
import type { ToolId } from './tool-definition';
import type { InvocationId } from './tool-invocation';
import type { CorrelationId } from '../../../shared/types';

describe('Capability-027 Iteration 2 Step 1 — Tool Value Objects & Errors', () => {
  const mockToolId = 'tool-calculator' as ToolId;
  const mockInvocationId = 'inv-001' as InvocationId;
  const mockCorrelationId = 'corr-001' as CorrelationId;

  it('creates immutable ToolSchema VO', () => {
    const schema = ToolSchema.create({
      rawSchema: {
        type: 'object',
        properties: { expression: { type: 'string' } },
      },
    });

    expect(schema.format).toBe('json_schema');
    expect(schema.rawSchema).toBeDefined();
    expect(Object.isFrozen(schema)).toBe(true);
  });

  it('creates ToolArguments VO with type-safe getter and JSON formatting', () => {
    const args = ToolArguments.create({
      rawJson: { expression: '2 + 2', precision: 2 },
    });

    expect(args.get<string>('expression')).toBe('2 + 2');
    expect(args.get<number>('precision')).toBe(2);
    expect(args.toJson()).toBe('{"expression":"2 + 2","precision":2}');
    expect(Object.isFrozen(args)).toBe(true);
  });

  it('creates immutable ToolDefinition VO', () => {
    const def = ToolDefinition.create({
      toolId: mockToolId,
      displayName: 'Calculator Tool',
      description: 'Evaluates math expressions',
      version: '1.0.0',
      inputSchema: ToolSchema.empty(),
      executionMode: 'local',
    });

    expect(def.toolId).toBe('tool-calculator');
    expect(def.executionMode).toBe('local');
    expect(Object.isFrozen(def)).toBe(true);
  });

  it('creates ToolInvocation and ToolResult VOs', () => {
    const invocation = ToolInvocation.create({
      invocationId: mockInvocationId,
      toolId: mockToolId,
      arguments: ToolArguments.create({ rawJson: { a: 1 } }),
      correlationId: mockCorrelationId,
    });

    expect(invocation.invocationId).toBe('inv-001');

    const result = ToolResult.create({
      invocationId: mockInvocationId,
      toolId: mockToolId,
      status: 'success',
      output: '4',
      executionTimeMs: 12,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.output).toBe('4');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('creates LLMToolCallContentPart and LLMToolResultContentPart helper parts', () => {
    const callPart = createToolCallPart('call-1', mockToolId, '{"a":1}');
    expect(callPart.type).toBe('tool_call');
    expect(callPart.callId).toBe('call-1');

    const resPart = createToolResultPart(
      'call-1',
      mockToolId,
      'Result: 4',
      false,
    );
    expect(resPart.type).toBe('tool_result');
    expect(resPart.output).toBe('Result: 4');
  });

  it('instantiates ToolExecutionError hierarchy', () => {
    const timeoutErr = new ToolTimeoutError(mockToolId, mockInvocationId, 5000);
    expect(timeoutErr).toBeInstanceOf(ToolExecutionError);
    expect(timeoutErr.timeoutMs).toBe(5000);

    const valErr = new ToolValidationError(mockToolId, mockInvocationId, [
      'Missing argument: expression',
    ]);
    expect(valErr).toBeInstanceOf(ToolExecutionError);

    const permErr = new ToolPermissionError(
      mockToolId,
      mockInvocationId,
      'tenant-999',
    );
    expect(permErr).toBeInstanceOf(ToolExecutionError);

    const unavailErr = new ToolUnavailableError(mockToolId, mockInvocationId);
    expect(unavailErr).toBeInstanceOf(ToolExecutionError);
  });
});

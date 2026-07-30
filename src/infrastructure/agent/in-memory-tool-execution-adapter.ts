import type { ToolExecutionPort } from '../../application/agent/ports/tool-execution-port';
import type { TenantContext } from '../../application/identity/tenant-context';
import type {
  ToolId,
  ToolDefinition,
} from '../../application/agent/vo/tool-definition';
import type { ToolInvocation } from '../../application/agent/vo/tool-invocation';
import { ToolResult } from '../../application/agent/vo/tool-result';
import { ToolExecutionError } from '../../application/agent/errors/tool-execution-error';

export type ToolExecuteHandler = (
  tenantContext: Readonly<TenantContext>,
  invocation: Readonly<ToolInvocation>,
) => Promise<ToolResult> | ToolResult;

export interface InMemoryToolExecutionAdapterConfig {
  readonly definition: ToolDefinition;
  readonly handler?: ToolExecuteHandler | undefined;
  readonly cannedOutput?: string | undefined;
  readonly executionTimeMs?: number | undefined;
}

export class InMemoryToolExecutionAdapter implements ToolExecutionPort {
  readonly toolId: ToolId;
  readonly definition: ToolDefinition;
  private readonly handler?: ToolExecuteHandler | undefined;
  private readonly cannedOutput: string;
  private readonly executionTimeMs: number;
  private callCountInternal = 0;

  constructor(config: Readonly<InMemoryToolExecutionAdapterConfig>) {
    if (!config || !config.definition) {
      throw new Error(
        '[InMemoryToolExecutionAdapter] ToolDefinition is required.',
      );
    }
    this.definition = config.definition;
    this.toolId = config.definition.toolId;
    this.handler = config.handler;
    this.cannedOutput =
      config.cannedOutput ?? 'InMemory tool execution output.';
    this.executionTimeMs = config.executionTimeMs ?? 5;
  }

  async execute(
    tenantContext: Readonly<TenantContext>,
    invocation: Readonly<ToolInvocation>,
  ): Promise<ToolResult> {
    if (!tenantContext || !tenantContext.tenantId) {
      throw new Error(
        '[InMemoryToolExecutionAdapter] TenantContext is required.',
      );
    }
    if (!invocation || !invocation.invocationId) {
      throw new Error(
        '[InMemoryToolExecutionAdapter] ToolInvocation is required.',
      );
    }

    this.callCountInternal++;

    try {
      if (this.handler) {
        return await this.handler(tenantContext, invocation);
      }

      return ToolResult.create({
        invocationId: invocation.invocationId,
        toolId: this.toolId,
        status: 'success',
        output: `${this.cannedOutput} [Invocation: ${invocation.invocationId}]`,
        executionTimeMs: this.executionTimeMs,
      });
    } catch (err: unknown) {
      if (err instanceof ToolExecutionError) {
        throw err;
      }
      const rawMessage = err instanceof Error ? err.message : String(err);
      throw new ConcreteToolExecutionError(
        this.toolId,
        invocation.invocationId,
        rawMessage,
      );
    }
  }

  get callCount(): number {
    return this.callCountInternal;
  }
}

class ConcreteToolExecutionError extends ToolExecutionError {
  constructor(
    toolId: ToolId,
    invocationId: import('../../application/agent/vo/tool-invocation').InvocationId,
    message: string,
  ) {
    super(toolId, invocationId, message);
    this.name = 'ConcreteToolExecutionError';
  }
}

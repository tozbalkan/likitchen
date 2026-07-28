import { TenantContext } from '../../identity/tenant-context';
import { ToolResolver } from '../services/tool-resolver';
import { ToolExecutionPipeline } from '../pipeline/tool-execution-pipeline';
import { ToolExecutionContext } from '../vo/tool-execution-context';
import { ExecutionEnvelope } from '../vo/execution-envelope';
import { ToolExecutionResult } from '../vo/tool-execution-result';

export interface ExecuteToolCommand {
  readonly toolId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly requestedVersion?: string | undefined;
  readonly tenantContext: TenantContext;
}

export class ExecuteToolCommandHandler {
  constructor(
    private readonly resolver: ToolResolver,
    private readonly pipeline: ToolExecutionPipeline,
  ) {}

  async execute(command: ExecuteToolCommand): Promise<ToolExecutionResult> {
    const resolved = await this.resolver.resolveTool(
      command.tenantContext,
      command.toolId,
      command.requestedVersion,
    );

    const policy =
      resolved.instance.customPolicy ?? resolved.version.defaultPolicy;

    const context = ToolExecutionContext.create({
      toolId: resolved.definition.toolId,
      instanceId: resolved.instance.instanceId,
      version: resolved.version.version,
      tenantContext: command.tenantContext,
      input: command.payload,
      provider: resolved.definition.provider,
      executionPolicy: policy,
      budget: policy.budget,
      isStreaming: false,
    });

    const initialEnvelope = ExecutionEnvelope.create(context, command.payload);
    const finalEnvelope = await this.pipeline.execute(initialEnvelope);

    if (!finalEnvelope.result) {
      throw new Error(
        `[ExecuteToolCommandHandler] Pipeline completed without producing execution result for tool '${command.toolId}'.`,
      );
    }

    return finalEnvelope.result;
  }
}

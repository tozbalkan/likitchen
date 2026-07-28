import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { ToolResolverPort } from '../ports/tool-resolver-port';

export class ToolStage implements ExecutionStage {
  readonly name = 'ToolStage';

  constructor(private readonly toolResolver: ToolResolverPort) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    const toolIds = context.plan?.toolIds ?? [];
    const tools = await this.toolResolver.resolveTools(toolIds);

    const resolvedToolNames = tools.map((t) => t.name);
    const updatedContext = context.copy({
      resolvedTools: resolvedToolNames,
    });

    return {
      status: 'CONTINUE',
      context: updatedContext,
      metadata: { resolvedToolCount: tools.length },
    };
  }
}

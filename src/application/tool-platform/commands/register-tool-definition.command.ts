import { TenantContext } from '../../identity/tenant-context';
import { ToolDefinition } from '../domain/tool-definition';
import { ToolVersion } from '../domain/tool-version';
import { ToolCategory } from '../vo/tool-category';
import { ToolExecutionPolicy } from '../vo/tool-execution-policy';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';

export interface RegisterToolDefinitionCommand {
  readonly toolId: string;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly provider: string;
  readonly version: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly requiredPermissions?: ReadonlyArray<string> | undefined;
  readonly tenantContext: TenantContext;
}

export class RegisterToolDefinitionCommandHandler {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async execute(
    command: RegisterToolDefinitionCommand,
  ): Promise<ToolDefinition> {
    const version = new ToolVersion({
      version: command.version,
      inputSchema: command.inputSchema,
      outputSchema: command.outputSchema,
      defaultPolicy: ToolExecutionPolicy.createDefault(),
    });

    const definition = ToolDefinition.create({
      toolId: command.toolId,
      name: command.name,
      description: command.description,
      category: command.category,
      provider: command.provider,
      versions: [version],
      defaultVersion: command.version,
      requiredPermissions: command.requiredPermissions ?? ['Tool.Execute'],
    });

    await this.repository.saveDefinition(command.tenantContext, definition);
    return definition;
  }
}

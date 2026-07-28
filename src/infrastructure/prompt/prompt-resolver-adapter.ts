import type {
  PromptResolverPort,
  PromptResolutionResult,
} from '../../application/agent/ports/prompt-resolver-port';
import type { PromptRepositoryPort } from '../../application/prompt/ports/prompt-repository-port';
import type { PromptRendererPort } from '../../application/prompt/ports/prompt-renderer-port';
import { PromptReference } from '../../application/prompt/prompt-reference';
import { ResolutionContext } from '../../application/prompt/resolution-context';
import { EnvironmentResolver } from '../../application/prompt/resolver/environment-resolver';
import { ExperimentResolver } from '../../application/prompt/resolver/experiment-resolver';
import { VersionResolver } from '../../application/prompt/resolver/version-resolver';
import { TenantContext } from '../../application/identity/tenant-context';

export class PromptResolverAdapter implements PromptResolverPort {
  private readonly environmentResolver: EnvironmentResolver;
  private readonly experimentResolver: ExperimentResolver;
  private readonly versionResolver: VersionResolver;

  constructor(
    repository: PromptRepositoryPort,
    rendererPort: PromptRendererPort,
  ) {
    this.environmentResolver = new EnvironmentResolver(repository);
    this.experimentResolver = new ExperimentResolver(repository);
    this.versionResolver = new VersionResolver(rendererPort);
  }

  async resolvePrompt(
    systemPromptReference: string,
    variables: Readonly<Record<string, unknown>>,
  ): Promise<PromptResolutionResult> {
    const reference = PromptReference.parse(systemPromptReference);

    // Extract tenantContext or create default fallback
    const tenantContext =
      (variables['tenantContext'] as TenantContext) ??
      TenantContext.create({
        tenantId: 'tenant-default',
        organizationId: 'org-default',
        workspaceId: 'ws-default',
        environment: 'production',
        region: 'us-east-1',
      });

    const env = (variables['environment'] as string) ?? 'production';

    const initialContext = ResolutionContext.create({
      reference,
      tenantContext,
      environment: env,
      variables,
    });

    // Immutable Resolver Chain Execution: EnvironmentResolver -> ExperimentResolver -> VersionResolver
    const envContext =
      await this.environmentResolver.resolveEnvironment(initialContext);
    const expContext =
      await this.experimentResolver.resolveExperiment(envContext);
    const finalContext =
      await this.versionResolver.resolveAndRender(expContext);

    const rendered = finalContext.renderedPrompt;
    if (!rendered) {
      throw new Error(
        `[PromptResolverAdapter] Failed to produce RenderedPrompt for '${systemPromptReference}'.`,
      );
    }

    return {
      systemPrompt: rendered.systemPrompt,
      userMessage: rendered.userMessage,
      resolvedPromptReference: rendered.resolvedReference,
    };
  }
}

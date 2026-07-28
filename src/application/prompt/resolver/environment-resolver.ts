import type { ResolutionContext } from '../resolution-context';
import type { PromptRepositoryPort } from '../ports/prompt-repository-port';
import { PromptDocument } from '../prompt-document';
import { PromptVersion } from '../prompt-version';

export class EnvironmentResolver {
  constructor(private readonly repository: PromptRepositoryPort) {}

  async resolveEnvironment(
    context: Readonly<ResolutionContext>,
  ): Promise<ResolutionContext> {
    const def = await this.repository.findDefinition(
      context.tenantContext,
      context.reference.namespace,
      context.reference.name,
    );

    if (!def) {
      // Create fallback document and version for unregistered references
      const fallbackDoc = PromptDocument.create({
        id: `doc-fallback-${context.reference.name}`,
        systemTemplate: `System prompt for [${context.reference.fullReference}]`,
        userTemplate: '{{userMessage}}',
        variables: ['userMessage'],
      });

      const fallbackVersion = PromptVersion.create({
        id: `v-fallback-${context.reference.name}`,
        promptId: `prompt-${context.reference.name}`,
        version: '1.0.0-fallback',
        document: fallbackDoc,
        status: 'PUBLISHED',
        createdAt: new Date(),
      });

      return context.withVersion(fallbackVersion);
    }

    // If explicit version is specified in reference, skip environment pointer lookups
    if (context.reference.explicitVersion) {
      const targetVersion = await this.repository.findVersion(
        context.tenantContext,
        context.reference.explicitVersion,
      );
      if (!targetVersion) {
        throw new Error(
          `[EnvironmentResolver] Explicit version '${context.reference.explicitVersion}' not found.`,
        );
      }
      return context.withVersion(targetVersion);
    }

    // Lookup environment pointer
    const pointer = await this.repository.findEnvironmentPointer(
      context.tenantContext,
      def.id,
      context.environment,
    );

    if (pointer) {
      const activeVersion = await this.repository.findVersion(
        context.tenantContext,
        pointer.activeVersionId,
      );
      if (activeVersion) {
        return context.withVersion(activeVersion);
      }
    }

    // Default fallback: latest currentVersionId on definition
    if (def.currentVersionId) {
      const currentVersion = await this.repository.findVersion(
        context.tenantContext,
        def.currentVersionId,
      );
      if (currentVersion) {
        return context.withVersion(currentVersion);
      }
    }

    throw new Error(
      `[EnvironmentResolver] Could not resolve environment version for '${context.reference.fullReference}'.`,
    );
  }
}

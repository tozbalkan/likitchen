import type { PromptPublisherPort } from './ports/prompt-publisher-port';
import type { PromptRepositoryPort } from './ports/prompt-repository-port';
import type { PromptValidatorPort } from './ports/prompt-validator-port';
import type { TenantContext } from '../identity/tenant-context';
import type { PromptVersion } from './prompt-version';

export class InvalidStatusTransitionException extends Error {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `[PromptPublisher] Invalid status transition from '${fromStatus}' to '${toStatus}'.`,
    );
    this.name = 'InvalidStatusTransitionException';
  }
}

export class PromptPublisherService implements PromptPublisherPort {
  constructor(
    private readonly repository: PromptRepositoryPort,
    private readonly validator: PromptValidatorPort,
  ) {}

  async publish(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion> {
    const version = await this.repository.findVersion(tenantContext, versionId);
    if (!version) {
      throw new Error(
        `[PromptPublisher] PromptVersion '${versionId}' not found.`,
      );
    }

    if (version.status === 'PUBLISHED') {
      return version;
    }

    if (version.status !== 'DRAFT' && version.status !== 'VALIDATED') {
      throw new InvalidStatusTransitionException(version.status, 'PUBLISHED');
    }

    // Run validation first
    const validationResult = await this.validator.validate(version.document);
    if (!validationResult.isValid) {
      throw new Error(
        `[PromptPublisher] Cannot publish version with validation errors: ${validationResult.errors.join('; ')}`,
      );
    }

    const publishedVersion = version.withStatus('PUBLISHED');
    await this.repository.saveVersion(
      tenantContext,
      publishedVersion,
      publishedVersion.document,
    );

    return publishedVersion;
  }

  async deprecate(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion> {
    const version = await this.repository.findVersion(tenantContext, versionId);
    if (!version) {
      throw new Error(
        `[PromptPublisher] PromptVersion '${versionId}' not found.`,
      );
    }

    if (version.status !== 'PUBLISHED') {
      throw new InvalidStatusTransitionException(version.status, 'DEPRECATED');
    }

    const deprecatedVersion = version.withStatus('DEPRECATED');
    await this.repository.saveVersion(
      tenantContext,
      deprecatedVersion,
      deprecatedVersion.document,
    );

    return deprecatedVersion;
  }

  async archive(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion> {
    const version = await this.repository.findVersion(tenantContext, versionId);
    if (!version) {
      throw new Error(
        `[PromptPublisher] PromptVersion '${versionId}' not found.`,
      );
    }

    if (version.status !== 'DEPRECATED' && version.status !== 'DRAFT') {
      throw new InvalidStatusTransitionException(version.status, 'ARCHIVED');
    }

    const archivedVersion = version.withStatus('ARCHIVED');
    await this.repository.saveVersion(
      tenantContext,
      archivedVersion,
      archivedVersion.document,
    );

    return archivedVersion;
  }
}

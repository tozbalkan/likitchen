import type { TenantContext } from '../../identity/tenant-context';
import type { PromptDefinition } from '../prompt-definition';
import type { PromptVersion } from '../prompt-version';
import type { PromptDocument } from '../prompt-document';
import type { PromptEnvironmentPointer } from '../prompt-environment';
import type { CompositeExperimentStrategy } from '../prompt-experiment';

export interface PromptRepositoryPort {
  findDefinition(
    tenantContext: Readonly<TenantContext>,
    namespace: string,
    name: string,
  ): Promise<PromptDefinition | undefined>;

  findVersion(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion | undefined>;

  findDocument(
    tenantContext: Readonly<TenantContext>,
    documentId: string,
  ): Promise<PromptDocument | undefined>;

  findEnvironmentPointer(
    tenantContext: Readonly<TenantContext>,
    promptId: string,
    environment: string,
  ): Promise<PromptEnvironmentPointer | undefined>;

  findExperiment(
    tenantContext: Readonly<TenantContext>,
    promptId: string,
  ): Promise<CompositeExperimentStrategy | undefined>;

  saveDefinition(
    tenantContext: Readonly<TenantContext>,
    definition: Readonly<PromptDefinition>,
  ): Promise<void>;

  saveVersion(
    tenantContext: Readonly<TenantContext>,
    version: Readonly<PromptVersion>,
    document: Readonly<PromptDocument>,
  ): Promise<void>;

  saveEnvironmentPointer(
    tenantContext: Readonly<TenantContext>,
    pointer: Readonly<PromptEnvironmentPointer>,
  ): Promise<void>;

  listDefinitions(
    tenantContext: Readonly<TenantContext>,
  ): Promise<readonly PromptDefinition[]>;

  listVersions(
    tenantContext: Readonly<TenantContext>,
    promptId: string,
  ): Promise<readonly PromptVersion[]>;
}

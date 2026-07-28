import type { PromptRepositoryPort } from '../../application/prompt/ports/prompt-repository-port';
import type { TenantContext } from '../../application/identity/tenant-context';
import type { PromptDefinition } from '../../application/prompt/prompt-definition';
import type { PromptVersion } from '../../application/prompt/prompt-version';
import type { PromptDocument } from '../../application/prompt/prompt-document';
import type { PromptEnvironmentPointer } from '../../application/prompt/prompt-environment';
import type { CompositeExperimentStrategy } from '../../application/prompt/prompt-experiment';

export class InMemoryPromptRepositoryAdapter implements PromptRepositoryPort {
  private readonly definitions = new Map<
    string,
    Map<string, PromptDefinition>
  >();
  private readonly versions = new Map<string, Map<string, PromptVersion>>();
  private readonly documents = new Map<string, Map<string, PromptDocument>>();
  private readonly pointers = new Map<
    string,
    Map<string, PromptEnvironmentPointer>
  >();
  private readonly experiments = new Map<
    string,
    Map<string, CompositeExperimentStrategy>
  >();

  private getTenantMap<T>(
    store: Map<string, Map<string, T>>,
    tenantId: string,
  ): Map<string, T> {
    let map = store.get(tenantId);
    if (!map) {
      map = new Map<string, T>();
      store.set(tenantId, map);
    }
    return map;
  }

  async findDefinition(
    tenantContext: Readonly<TenantContext>,
    namespace: string,
    name: string,
  ): Promise<PromptDefinition | undefined> {
    const map = this.getTenantMap(this.definitions, tenantContext.tenantId);
    const key = `${namespace}/${name}`;
    return map.get(key);
  }

  async findVersion(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion | undefined> {
    const map = this.getTenantMap(this.versions, tenantContext.tenantId);
    return map.get(versionId);
  }

  async findDocument(
    tenantContext: Readonly<TenantContext>,
    documentId: string,
  ): Promise<PromptDocument | undefined> {
    const map = this.getTenantMap(this.documents, tenantContext.tenantId);
    return map.get(documentId);
  }

  async findEnvironmentPointer(
    tenantContext: Readonly<TenantContext>,
    promptId: string,
    environment: string,
  ): Promise<PromptEnvironmentPointer | undefined> {
    const map = this.getTenantMap(this.pointers, tenantContext.tenantId);
    const key = `${promptId}:${environment}`;
    return map.get(key);
  }

  async findExperiment(
    tenantContext: Readonly<TenantContext>,
    promptId: string,
  ): Promise<CompositeExperimentStrategy | undefined> {
    const map = this.getTenantMap(this.experiments, tenantContext.tenantId);
    return map.get(promptId);
  }

  async saveDefinition(
    tenantContext: Readonly<TenantContext>,
    definition: Readonly<PromptDefinition>,
  ): Promise<void> {
    const map = this.getTenantMap(this.definitions, tenantContext.tenantId);
    const key = `${definition.namespace}/${definition.name}`;
    map.set(key, definition as PromptDefinition);
  }

  async saveVersion(
    tenantContext: Readonly<TenantContext>,
    version: Readonly<PromptVersion>,
    document: Readonly<PromptDocument>,
  ): Promise<void> {
    const versionMap = this.getTenantMap(this.versions, tenantContext.tenantId);
    const docMap = this.getTenantMap(this.documents, tenantContext.tenantId);

    versionMap.set(version.id, version as PromptVersion);
    docMap.set(document.id, document as PromptDocument);
  }

  async saveEnvironmentPointer(
    tenantContext: Readonly<TenantContext>,
    pointer: Readonly<PromptEnvironmentPointer>,
  ): Promise<void> {
    const map = this.getTenantMap(this.pointers, tenantContext.tenantId);
    const key = `${pointer.promptId}:${pointer.environment}`;
    map.set(key, pointer as PromptEnvironmentPointer);
  }

  saveExperiment(
    tenantContext: Readonly<TenantContext>,
    promptId: string,
    experiment: Readonly<CompositeExperimentStrategy>,
  ): void {
    const map = this.getTenantMap(this.experiments, tenantContext.tenantId);
    map.set(promptId, experiment as CompositeExperimentStrategy);
  }

  async listDefinitions(
    tenantContext: Readonly<TenantContext>,
  ): Promise<readonly PromptDefinition[]> {
    const map = this.getTenantMap(this.definitions, tenantContext.tenantId);
    return Array.from(map.values());
  }

  async listVersions(
    tenantContext: Readonly<TenantContext>,
    promptId: string,
  ): Promise<readonly PromptVersion[]> {
    const map = this.getTenantMap(this.versions, tenantContext.tenantId);
    return Array.from(map.values()).filter((v) => v.promptId === promptId);
  }
}

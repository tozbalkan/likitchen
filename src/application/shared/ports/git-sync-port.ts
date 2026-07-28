/**
 * Shared Contract for Future Capability-023 (PromptOps & Governance)
 * Intentionally un-implemented in Capability-022.
 */
export interface GitSyncPort {
  pull(remoteRef: string): Promise<Record<string, unknown>>;
  push(localRef: string): Promise<void>;
}

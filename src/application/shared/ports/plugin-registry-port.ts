/**
 * Shared Contract for Future Capability-023 (PromptOps & Governance)
 * Intentionally un-implemented in Capability-022.
 */
export interface PluginRegistryPort {
  registerPlugin(manifest: Readonly<Record<string, unknown>>): Promise<void>;
}

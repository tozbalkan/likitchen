/**
 * Shared Contract for Future Capability-023 (PromptOps & Governance)
 * Intentionally un-implemented in Capability-022.
 */
export interface PackagePublisherPort {
  publishPackage(
    packageBundle: Readonly<Record<string, unknown>>,
  ): Promise<void>;
}

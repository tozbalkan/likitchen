/**
 * Shared Contract for Future Capability-023 (PromptOps & Governance)
 * Intentionally un-implemented in Capability-022.
 */
export interface AuditPublisherPort {
  publishAudit(event: Readonly<Record<string, unknown>>): Promise<void>;
}

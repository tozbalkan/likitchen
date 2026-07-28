/**
 * Shared Contract Stub for Future Capability-024 (Workflow & Agent Planning)
 * Intentionally un-implemented in Capability-023.
 */
export interface ToolInvocationPolicyPort {
  canCallTool(toolId: string, tenantId: string): Promise<boolean>;
  canParallelize(toolIds: ReadonlyArray<string>): Promise<boolean>;
  canRetry(toolId: string, attemptCount: number): Promise<boolean>;
  canStream(toolId: string): Promise<boolean>;
  estimateCostUSD(
    toolId: string,
    input: Readonly<Record<string, unknown>>,
  ): Promise<number>;
}

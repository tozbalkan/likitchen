/**
 * Shared Contract Stub for Future Capability-024 (Workflow & Agent Planning)
 * Intentionally un-implemented in Capability-023.
 */
export interface ExecutionPlanningPort {
  createExecutionPlan(
    workflowId: string,
    toolSequence: ReadonlyArray<string>,
  ): Promise<Record<string, unknown>>;
}

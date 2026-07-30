import type { TenantContext } from '../../../identity/tenant-context';
import type { ContextAssemblyRequest } from '../../vo/context-assembly-request';
import type { RawCandidateSet } from './context-candidate-collector';
import type { ContextEntry } from '../../vo/context-entry';
import type { ContextConflict } from '../../vo/context-conflict';
import type { ContextSourceType } from '../../vo/context-source-type';
import type { SourceUtilization } from '../../vo/context-assembly-trace';

/**
 * Mutable/Extensible Pipeline State passed sequentially through each pipeline step.
 */
export interface ContextAssemblyPipelineState {
  readonly tenantContext: Readonly<TenantContext>;
  readonly request: Readonly<ContextAssemblyRequest>;
  rawCandidates?: RawCandidateSet | undefined;
  normalizedEntries: ReadonlyArray<ContextEntry>;
  conflicts: ReadonlyArray<ContextConflict>;
  includedEntries: ReadonlyArray<ContextEntry>;
  totalTokensUsed: number;
  totalItemsDiscarded: number;
  utilizationBySource: ReadonlyMap<ContextSourceType, SourceUtilization>;
  sourceCounts: ReadonlyMap<ContextSourceType, number>;
  stepTimingsMs: Map<string, number>;
}

/**
 * Plug-in interface for Context Assembly Pipeline Steps.
 * Allows adding new steps (e.g. MCP Connectors, Vector Rerankers, Semantic Cache)
 * without modifying ContextAssembler or existing pipeline code.
 */
export interface ContextAssemblyStep {
  readonly name: string;
  execute(
    state: ContextAssemblyPipelineState,
  ): Promise<ContextAssemblyPipelineState> | ContextAssemblyPipelineState;
}

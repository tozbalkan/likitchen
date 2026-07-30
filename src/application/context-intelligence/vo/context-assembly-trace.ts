import type { ContextSourceType } from './context-source-type';

export interface SourceUtilization {
  readonly tokensUsed: number;
  readonly itemsIncluded: number;
  readonly itemsDiscarded: number;
}

export interface ContextAssemblyTraceProps {
  readonly assemblyDurationMs: number;
  readonly retrievalDurationMs: number;
  readonly authorizationDurationMs: number;
  readonly normalizationDurationMs: number;
  readonly conflictDetectionDurationMs: number;
  readonly orderingDurationMs: number;
  readonly sourceCounts: ReadonlyMap<ContextSourceType, number>;
  readonly candidateCounts: ReadonlyMap<ContextSourceType, number>;
  readonly totalTokensUsed: number;
  readonly totalItemsIncluded: number;
  readonly totalItemsDiscarded: number;
  readonly utilizationBySource: ReadonlyMap<
    ContextSourceType,
    SourceUtilization
  >;
}

/**
 * Observability metadata for a context assembly operation.
 * Does not contain raw content — only IDs, scores, counts, and durations.
 */
export class ContextAssemblyTrace {
  readonly assemblyDurationMs: number;
  readonly retrievalDurationMs: number;
  readonly authorizationDurationMs: number;
  readonly normalizationDurationMs: number;
  readonly conflictDetectionDurationMs: number;
  readonly orderingDurationMs: number;
  readonly sourceCounts: ReadonlyMap<ContextSourceType, number>;
  readonly candidateCounts: ReadonlyMap<ContextSourceType, number>;
  readonly totalTokensUsed: number;
  readonly totalItemsIncluded: number;
  readonly totalItemsDiscarded: number;
  readonly utilizationBySource: ReadonlyMap<
    ContextSourceType,
    SourceUtilization
  >;

  constructor(props: ContextAssemblyTraceProps) {
    this.assemblyDurationMs = props.assemblyDurationMs;
    this.retrievalDurationMs = props.retrievalDurationMs;
    this.authorizationDurationMs = props.authorizationDurationMs;
    this.normalizationDurationMs = props.normalizationDurationMs;
    this.conflictDetectionDurationMs = props.conflictDetectionDurationMs;
    this.orderingDurationMs = props.orderingDurationMs;
    this.sourceCounts = props.sourceCounts;
    this.candidateCounts = props.candidateCounts;
    this.totalTokensUsed = props.totalTokensUsed;
    this.totalItemsIncluded = props.totalItemsIncluded;
    this.totalItemsDiscarded = props.totalItemsDiscarded;
    this.utilizationBySource = props.utilizationBySource;
    Object.freeze(this);
  }
}

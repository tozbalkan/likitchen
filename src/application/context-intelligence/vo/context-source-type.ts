/**
 * Context source types ordered by static priority for conflict resolution.
 * Priority is used for deterministic precedence only — higher-priority sources
 * do NOT replace lower-priority sources wholesale.
 */
export type ContextSourceType =
  | 'SYSTEM_CONTEXT'
  | 'VARIABLE'
  | 'ARTIFACT'
  | 'EXECUTION_TRACE'
  | 'MEMORY'
  | 'KNOWLEDGE';

/**
 * Static priority order (highest to lowest).
 * Used for deterministic conflict resolution and ordering precedence.
 */
export const CONTEXT_SOURCE_PRIORITY: ReadonlyArray<ContextSourceType> =
  Object.freeze([
    'SYSTEM_CONTEXT',
    'VARIABLE',
    'ARTIFACT',
    'EXECUTION_TRACE',
    'MEMORY',
    'KNOWLEDGE',
  ]);

/**
 * Returns the numeric priority for a source type (higher = more important).
 */
export function getSourcePriority(sourceType: ContextSourceType): number {
  const index = CONTEXT_SOURCE_PRIORITY.indexOf(sourceType);
  if (index === -1) {
    throw new Error(
      `[ContextSourcePriority] Unknown source type '${sourceType}'.`,
    );
  }
  return CONTEXT_SOURCE_PRIORITY.length - index;
}

import type { ResolutionContext } from './resolution-context';

export interface ExperimentVariant {
  readonly versionId: string;
  readonly versionNumber: string;
  readonly weightPercentage: number;
}

export interface ExperimentStrategy {
  readonly name: string;
  readonly priority: number;
  evaluate(context: Readonly<ResolutionContext>): string | undefined;
}

export class TrafficSplitStrategy implements ExperimentStrategy {
  readonly name = 'TrafficSplitStrategy';
  readonly priority = 10;

  constructor(
    private readonly variants: readonly ExperimentVariant[],
    private readonly experimentId: string,
  ) {}

  evaluate(context: Readonly<ResolutionContext>): string | undefined {
    if (this.variants.length === 0) return undefined;

    // Simple deterministic hash based on sessionId or correlationId
    const seed =
      context.tenantContext.tenantId + context.reference.fullReference;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const normalized = Math.abs(hash) % 100;

    let cumulative = 0;
    for (const variant of this.variants) {
      cumulative += variant.weightPercentage;
      if (normalized < cumulative) {
        return variant.versionId;
      }
    }
    return this.variants[0]?.versionId;
  }
}

export class FeatureFlagStrategy implements ExperimentStrategy {
  readonly name = 'FeatureFlagStrategy';
  readonly priority = 100;

  constructor(
    private readonly flagKey: string,
    private readonly targetVersionId: string,
  ) {}

  evaluate(context: Readonly<ResolutionContext>): string | undefined {
    const isEnabled = context.variables[this.flagKey] === true;
    return isEnabled ? this.targetVersionId : undefined;
  }
}

export class CompositeExperimentStrategy implements ExperimentStrategy {
  readonly name = 'CompositeExperimentStrategy';
  readonly priority = 0;
  private readonly strategies: readonly ExperimentStrategy[];

  constructor(strategies: readonly ExperimentStrategy[]) {
    // Sort strategies by descending priority (e.g. 100 before 10)
    this.strategies = Object.freeze(
      [...strategies].sort((a, b) => b.priority - a.priority),
    );
    Object.freeze(this);
  }

  evaluate(context: Readonly<ResolutionContext>): string | undefined {
    for (const strategy of this.strategies) {
      const selectedVersionId = strategy.evaluate(context);
      if (selectedVersionId) {
        return selectedVersionId;
      }
    }
    return undefined;
  }
}

import type { MergeStrategyPort } from './ports/merge-strategy-port';
import { ThreeWayMergeStrategy } from './three-way-merge-service';
import { MergeContext } from './prompt-merge-result';

export class MergeStrategyResolver {
  private readonly strategies = new Map<string, MergeStrategyPort>();

  constructor(defaultStrategies?: ReadonlyArray<MergeStrategyPort>) {
    const defaultThreeWay = new ThreeWayMergeStrategy();
    this.strategies.set(defaultThreeWay.name, defaultThreeWay);

    if (defaultStrategies) {
      for (const s of defaultStrategies) {
        this.strategies.set(s.name, s);
      }
    }
  }

  resolveStrategy(context: Readonly<MergeContext>): MergeStrategyPort {
    if (
      context.workspacePolicy === 'OursStrategy' &&
      this.strategies.has('OursStrategy')
    ) {
      return this.strategies.get('OursStrategy')!;
    }
    if (
      context.workspacePolicy === 'TheirsStrategy' &&
      this.strategies.has('TheirsStrategy')
    ) {
      return this.strategies.get('TheirsStrategy')!;
    }
    return this.strategies.get('ThreeWayMergeStrategy')!;
  }
}

import type { ExecutionContext } from '../context/execution-context';

export interface SamplingPolicyPort {
  shouldSampleTrace(
    context: Readonly<ExecutionContext>,
    spanName: string,
  ): boolean;
  shouldSampleMetric(
    context: Readonly<ExecutionContext>,
    metricName: string,
  ): boolean;
}

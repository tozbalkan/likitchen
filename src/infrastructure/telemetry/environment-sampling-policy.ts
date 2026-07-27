import type { SamplingPolicyPort } from '../../application/telemetry/sampling-policy-port';
import type { ConfigurationPort } from '../../application/telemetry/configuration-port';
import type { ExecutionContext } from '../../application/context/execution-context';

export class EnvironmentSamplingPolicy implements SamplingPolicyPort {
  constructor(private readonly config: ConfigurationPort) {}

  shouldSampleTrace(
    _context: Readonly<ExecutionContext>,
    spanName: string,
  ): boolean {
    const traceRate = this.config.getNumber('TRACE_SAMPLE_RATE', 1.0);
    if (spanName.includes('error') || spanName.includes('fallback')) {
      return true; // 100% sampling for errors and fallbacks
    }
    return Math.random() < traceRate;
  }

  shouldSampleMetric(
    _context: Readonly<ExecutionContext>,
    _metricName: string,
  ): boolean {
    return true; // 100% metric collection
  }
}

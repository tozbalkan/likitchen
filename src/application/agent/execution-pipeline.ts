import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from './execution-stage';
import type { TelemetryPort } from '../telemetry/telemetry-port';

export class PipelineValidationException extends Error {
  constructor(message: string) {
    super(`[ExecutionPipelineBuilder] Pipeline validation failed: ${message}`);
    this.name = 'PipelineValidationException';
  }
}

export class ExecutionPipeline {
  readonly stages: readonly ExecutionStage[];

  constructor(stages: readonly ExecutionStage[]) {
    this.stages = Object.freeze([...stages]);
    Object.freeze(this);
  }

  async execute(
    initialContext: Readonly<StageContext>,
    telemetryPort?: TelemetryPort,
  ): Promise<StageContext> {
    let currentContext = initialContext;

    for (const stage of this.stages) {
      currentContext.cancellationToken.throwIfCancelled();

      const startTime = Date.now();

      if (telemetryPort) {
        telemetryPort.counter(currentContext.executionContext, {
          name: `stage.${stage.name}.started`,
        });
      }

      let result: StageResult;
      try {
        result = await stage.execute(currentContext);
      } catch (error: unknown) {
        if (telemetryPort) {
          telemetryPort.counter(currentContext.executionContext, {
            name: `stage.${stage.name}.failed`,
          });
        }
        throw error;
      }

      const durationMs = Date.now() - startTime;
      if (telemetryPort) {
        telemetryPort.histogram(currentContext.executionContext, {
          name: `stage.${stage.name}.duration_ms`,
          value: durationMs,
        });
        telemetryPort.counter(currentContext.executionContext, {
          name: `stage.${stage.name}.completed`,
        });
      }

      currentContext = result.context;

      if (result.status === 'STOP' || result.status === 'FAIL') {
        break;
      }
    }

    return currentContext;
  }
}

export class ExecutionPipelineBuilder {
  private readonly stages: ExecutionStage[] = [];

  addStage(stage: ExecutionStage): this {
    this.stages.push(stage);
    return this;
  }

  build(): ExecutionPipeline {
    if (this.stages.length === 0) {
      throw new PipelineValidationException(
        'Pipeline must contain at least one stage.',
      );
    }

    const names = this.stages.map((s) => s.name);

    // 1. Unique stage names
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new PipelineValidationException(
        'Pipeline contains duplicate stage names.',
      );
    }

    // 2. ContextStage must be first
    if (names[0] !== 'ContextStage') {
      throw new PipelineValidationException(
        'First stage must be ContextStage.',
      );
    }

    // 3. TelemetryStage must be last
    if (names[names.length - 1] !== 'TelemetryStage') {
      throw new PipelineValidationException(
        'Last stage must be TelemetryStage.',
      );
    }

    // 4. Exactly one DispatchStage
    const dispatchCount = names.filter((n) => n === 'DispatchStage').length;
    if (dispatchCount !== 1) {
      throw new PipelineValidationException(
        `Pipeline must contain exactly one DispatchStage, but found ${dispatchCount}.`,
      );
    }

    return new ExecutionPipeline(this.stages);
  }
}

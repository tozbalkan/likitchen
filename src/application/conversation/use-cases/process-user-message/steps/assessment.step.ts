import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import { calculateReadiness } from '../../../../../domain/conversation/scoring';
import { calculateConfidence } from '../../../../../domain/conversation/scoring';
import { recommend } from '../../../../../domain/conversation/recommendation';
import type { Clock } from '../../../../ports/clock';

export class AssessmentStep implements PipelineStep {
  constructor(private readonly clock: Clock) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.mergeResult) {
      return err({
        code: 'MissingStateError',
        message: 'mergeResult is missing from context.',
      });
    }

    const facts = context.mergeResult.facts;
    const readiness = calculateReadiness(facts);
    const confidence = calculateConfidence(facts);
    const locationStatus = facts.service_area_status ?? 'unresolved';
    const missingRequiredFields = !facts.project_type || !facts.location_raw;

    const recommendation = recommend({
      readiness,
      confidence,
      locationStatus,
      missingRequiredFields,
    });

    return ok({
      ...context,
      assessmentSnapshot: {
        readiness: readiness ?? 0,
        confidence,
        recommendation: recommendation.recommendation,
        reasons: recommendation.reasons,
        calculatedAt: this.clock.now(),
      },
    });
  }
}

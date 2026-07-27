import type { ConversationAssessment } from '../../domain/conversation/recommendation';

export enum CalibrationReason {
  MissingContactInformation = 'MissingContactInformation',
  ConflictingFacts = 'ConflictingFacts',
  HumanReviewRequired = 'HumanReviewRequired',
  LowEvidence = 'LowEvidence',
  AmbiguousIntent = 'AmbiguousIntent',
  TransferCappedConfidence = 'TransferCappedConfidence',
}

export interface CalibrationAdjustment {
  readonly reason: CalibrationReason;
  readonly delta: number;
}

export interface CalibrationResult {
  readonly confidence: number;
  readonly adjustments: readonly CalibrationAdjustment[];
}

export class ConfidenceCalibration {
  /**
   * Adjusts the raw confidence score post-assessment.
   * Ensures the final confidence remains between 0 and 100.
   */
  calibrate(assessment: ConversationAssessment): CalibrationResult {
    let currentConfidence = assessment.confidence;
    const adjustments: CalibrationAdjustment[] = [];

    // Example logic: if we have facts but the budget is vague or contradictory, we might lower confidence.
    // In a real scenario, this could look at the raw AI response or semantic markers.
    if (
      currentConfidence > 80 &&
      assessment.recommendation === 'route_to_human'
    ) {
      adjustments.push({
        reason: CalibrationReason.TransferCappedConfidence,
        delta: -10,
      });
      currentConfidence -= 10;
    }

    // Ensure bounds
    if (currentConfidence < 0) currentConfidence = 0;
    if (currentConfidence > 100) currentConfidence = 100;

    return {
      confidence: currentConfidence,
      adjustments,
    };
  }
}

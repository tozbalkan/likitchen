import { describe, it, expect } from 'vitest';
import { ConfidenceCalibration } from './calibration';
import type { ConversationAssessment } from '../../domain/conversation/recommendation';

describe('ConfidenceCalibration', () => {
  const calibration = new ConfidenceCalibration();

  it('should penalize confidence if recommendation is route_to_human and confidence is high', () => {
    const assessment: ConversationAssessment = {
      readiness: 0,
      confidence: 90,
      recommendation: 'route_to_human',
      reasons: ['User is asking complex questions'],
      calculatedAt: '2024-01-01T00:00:00Z' as never,
    };

    const result = calibration.calibrate(assessment);

    expect(result.confidence).toBe(80);
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0]?.delta).toBe(-10);
  });

  it('should not penalize confidence if recommendation is not route_to_human', () => {
    const assessment: ConversationAssessment = {
      readiness: 100,
      confidence: 90,
      recommendation: 'ask_followup',
      reasons: [],
      calculatedAt: '2024-01-01T00:00:00Z' as never,
    };

    const result = calibration.calibrate(assessment);

    expect(result.confidence).toBe(90);
    expect(result.adjustments).toHaveLength(0);
  });

  it('should clamp confidence between 0 and 100', () => {
    const assessment: ConversationAssessment = {
      readiness: 100,
      confidence: 150, // Invalid, but check clamping
      recommendation: 'ask_followup',
      reasons: [],
      calculatedAt: '2024-01-01T00:00:00Z' as never,
    };

    const result = calibration.calibrate(assessment);

    expect(result.confidence).toBe(100);
  });
});

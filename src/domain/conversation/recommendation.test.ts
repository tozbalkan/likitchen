import { describe, it, expect } from 'vitest';
import { recommend, type RecommendationInput } from './recommendation';

describe('Recommendation Engine', () => {
  it('should ask followup if required fields are missing', () => {
    const input: RecommendationInput = {
      readiness: 90,
      confidence: 90,
      locationStatus: 'supported',
      missingRequiredFields: true,
    };
    const decision = recommend(input);
    expect(decision.recommendation).toBe('ask_followup');
  });

  it('should ask followup if location is unresolved', () => {
    const input: RecommendationInput = {
      readiness: 90,
      confidence: 90,
      locationStatus: 'unresolved',
      missingRequiredFields: false,
    };
    const decision = recommend(input);
    expect(decision.recommendation).toBe('ask_followup');
  });

  it('should return out_of_service_area if location is unsupported', () => {
    const input: RecommendationInput = {
      readiness: 90,
      confidence: 90,
      locationStatus: 'unsupported',
      missingRequiredFields: false,
    };
    const decision = recommend(input);
    expect(decision.recommendation).toBe('out_of_service_area');
  });

  it('should ask followup if confidence is below minimum', () => {
    const input: RecommendationInput = {
      readiness: 90,
      confidence: 40, // below 50
      locationStatus: 'supported',
      missingRequiredFields: false,
    };
    const decision = recommend(input);
    expect(decision.recommendation).toBe('ask_followup');
  });

  it('should route to human if readiness is high enough', () => {
    const input: RecommendationInput = {
      readiness: 85, // above 40
      confidence: 80,
      locationStatus: 'supported',
      missingRequiredFields: false,
    };
    const decision = recommend(input);
    expect(decision.recommendation).toBe('route_to_human');
  });

  it('should be low priority if all is good but readiness is low', () => {
    const input: RecommendationInput = {
      readiness: 20, // below 40
      confidence: 80,
      locationStatus: 'supported',
      missingRequiredFields: false,
    };
    const decision = recommend(input);
    expect(decision.recommendation).toBe('low_priority');
  });
});

import { describe, it, expect } from 'vitest';
import { TransportNormalizer } from './transport-normalizer';

describe('TransportNormalizer', () => {
  const normalizer = new TransportNormalizer();

  it('should strip markdown code blocks', () => {
    const raw = '```json\n{"foo": "bar"}\n```';
    const result = normalizer.normalize(raw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('{"foo": "bar"}');
    }
  });

  it('should ignore plain json', () => {
    const raw = '{"foo": "bar"}';
    const result = normalizer.normalize(raw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('{"foo": "bar"}');
    }
  });

  it('should trim surrounding whitespace', () => {
    const raw = '   {"foo": "bar"}   ';
    const result = normalizer.normalize(raw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('{"foo": "bar"}');
    }
  });
});

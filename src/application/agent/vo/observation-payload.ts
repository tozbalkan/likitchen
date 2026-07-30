export interface TextObservationPayload {
  readonly type: 'text';
  readonly content: string;
}

export type ObservationPayload = TextObservationPayload;

export function createTextObservationPayload(
  content: string,
): TextObservationPayload {
  return Object.freeze({
    type: 'text' as const,
    content: content ?? '',
  });
}

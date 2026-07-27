import { createHash } from 'crypto';
import type { PromptFingerprint } from './prompt-types';

export interface RenderedPrompt {
  readonly text: string;
  readonly fingerprint: PromptFingerprint;
}

export class PromptRenderer {
  render(
    template: string,
    variables: Readonly<Record<string, string>>,
  ): RenderedPrompt {
    let text = template;
    for (const [key, value] of Object.entries(variables)) {
      text = text.replaceAll(`{{${key}}}`, value);
    }

    const fingerprint = createHash('sha256').update(text).digest('hex');

    return {
      text,
      fingerprint,
    };
  }
}

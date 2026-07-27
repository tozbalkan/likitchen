import type {
  QuestionGenerationPort,
  QuestionPromptContext,
} from './question-generation-port';
import type { FactKey } from '../../../domain/conversation/policy/completion/completion-requirements';

export interface GeneratedQuestion {
  readonly text: string;
  readonly source: 'llm' | 'fallback';
  readonly promptFingerprint: string;
}

const STATIC_FALLBACK_QUESTIONS: Partial<Record<FactKey, string>> = {
  project_type: 'What type of kitchen remodeling project are you planning?',
  budget_range: 'What is your estimated budget for this project?',
  timeline: 'When are you looking to get this project started?',
  location_raw: 'What city or town is the project located in?',
  attachments: 'Do you have any photos or design documents to share?',
  service_area_status: 'What is your location?',
};

export class QuestionGenerator {
  private readonly DEFAULT_FINGERPRINT = 'static-fallback-v1';

  constructor(private readonly port?: QuestionGenerationPort) {}

  async generate(
    context: Readonly<QuestionPromptContext>,
  ): Promise<GeneratedQuestion> {
    if (this.port) {
      try {
        const text = await this.port.generateQuestion(context);
        if (text && text.trim().length > 0) {
          return {
            text: text.trim(),
            source: 'llm',
            promptFingerprint: 'llm-dynamic-v1',
          };
        }
      } catch {
        // Fallback to static template on error
      }
    }

    const fallbackText =
      STATIC_FALLBACK_QUESTIONS[context.factKey] ??
      'Could you provide more details about your project?';

    return {
      text: fallbackText,
      source: 'fallback',
      promptFingerprint: this.DEFAULT_FINGERPRINT,
    };
  }
}

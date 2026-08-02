import { describe, it, expect } from 'vitest';
import { ConversationPipelineFacade } from '../../application/conversation/services/conversation-pipeline-facade';
import { OpenAiFactExtractionAdapter } from '../ai/openai-fact-extraction-adapter';
import { FactExtractionPromptBuilder } from '../ai/fact-extraction-prompt-builder';
import { DefaultConversationMerger } from '../../domain/conversation/pipeline/conversation-merger';
import { SystemClock } from '../clock/system-clock';
import type { Uuid } from '../../shared/types';

describe('Milestone 030.3: ConversationPipelineFacade End-to-End Loop', () => {
  it('1. Executes end-to-end conversation processing from user message to reply', async () => {
    const facade = new ConversationPipelineFacade({
      extractionPort: new OpenAiFactExtractionAdapter(),
      promptBuilder: new FactExtractionPromptBuilder(),
      factMerger: new DefaultConversationMerger(),
      clock: new SystemClock(),
    });

    const result = await facade.processIncomingMessage(
      'conv-100' as Uuid,
      'I live in Nassau County and need a full kitchen remodel with a budget of $40,000 starting in September.',
    );

    expect(result.replyText).toBeDefined();
    expect(typeof result.isReadyForHandoff).toBe('boolean');
  });
});

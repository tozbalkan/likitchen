import type { AiOutput } from '../../../ai/contracts/ai-output-schema';
import type { ExtractedFacts } from '../../../../domain/conversation/conversation-facts';
import { ok, err, type Result } from '../../../../shared/result';
import type { ApplicationError } from '../../../../shared/errors/error';

export interface ParserFailure extends ApplicationError {
  readonly code: 'ParserFailure';
  readonly version: number;
}

export function createParserFailure(
  version: number,
  message: string,
): ParserFailure {
  return {
    code: 'ParserFailure',
    message,
    version,
  };
}

export interface AiOutputParserStrategy {
  parse(validatedContract: AiOutput): Result<ExtractedFacts, ParserFailure>;
}

export class V1ParserStrategy implements AiOutputParserStrategy {
  parse(validatedContract: AiOutput): Result<ExtractedFacts, ParserFailure> {
    // In V1, the contract already maps extremely closely to ExtractedFacts
    // so this mapping is trivial. In future versions, fields might be renamed.
    return ok(validatedContract.extractedFacts as ExtractedFacts);
  }
}

export class ConversationParser {
  private strategies = new Map<number, AiOutputParserStrategy>();

  constructor() {
    this.strategies.set(1, new V1ParserStrategy());
  }

  parse(
    schemaVersion: number,
    validatedContract: AiOutput,
  ): Result<ExtractedFacts, ParserFailure> {
    const strategy = this.strategies.get(schemaVersion);
    if (!strategy) {
      return err(
        createParserFailure(
          schemaVersion,
          `Unsupported schema version: ${schemaVersion}`,
        ),
      );
    }

    return strategy.parse(validatedContract);
  }
}

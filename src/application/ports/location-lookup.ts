import type { ResolvedFacts } from '../../domain/conversation';

export interface LocationLookup {
  lookup(town: string): Promise<ResolvedFacts>;
}

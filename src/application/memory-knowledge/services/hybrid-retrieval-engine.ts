import { AuthorizedCandidateSet } from './memory-access-evaluator';
import { MemoryRecord } from '../domain/memory-record';
import { KnowledgeDocument } from '../domain/knowledge-document';

export interface SearchResultItem {
  readonly id: string;
  readonly type: 'MEMORY' | 'KNOWLEDGE';
  readonly titleOrKey: string;
  readonly content: string;
  readonly finalScore: number;
  readonly hybridScore: number;
  readonly recencyMultiplier: number;
  readonly freshnessMultiplier: number;
  readonly memoryRecord?: MemoryRecord | undefined;
  readonly knowledgeDocument?: KnowledgeDocument | undefined;
}

export interface HybridSearchOptions {
  readonly limit?: number | undefined;
  readonly semanticWeight?: number | undefined; // default 0.7
  readonly keywordWeight?: number | undefined; // default 0.3
  readonly recencyLambda?: number | undefined; // default 0.05
}

export class HybridRetrievalEngine {
  search(
    query: string,
    authorizedCandidates: Readonly<AuthorizedCandidateSet>,
    options?: HybridSearchOptions,
  ): ReadonlyArray<SearchResultItem> {
    const limit = options?.limit ?? 10;
    const wSemantic = options?.semanticWeight ?? 0.7;
    const wKeyword = options?.keywordWeight ?? 0.3;
    const lambda = options?.recencyLambda ?? 0.05;

    const normalizedQuery = query.toLowerCase().trim();
    const queryTokens = normalizedQuery
      .split(/\s+/)
      .filter((t) => t.length > 0);
    const now = new Date();

    const results: SearchResultItem[] = [];

    // 1. Process Authorized Memory Records
    for (const memory of authorizedCandidates.memories) {
      if (!memory.isRetrievable()) continue;

      const text = `${memory.key} ${memory.content}`.toLowerCase();
      const keywordScore = this.computeKeywordScore(queryTokens, text);

      // Semantic Score fallback token overlap / similarity metric
      const semanticScore = this.computeSemanticSimFallback(queryTokens, text);

      const hybridScore = semanticScore * wSemantic + keywordScore * wKeyword;
      const recencyMultiplier = this.computeRecencyMultiplier(
        memory.createdAt,
        now,
        lambda,
      );
      const freshnessMultiplier = 1.0; // Memory records do not expire unless deleted

      const finalScore = hybridScore * recencyMultiplier * freshnessMultiplier;

      if (finalScore > 0) {
        results.push({
          id: memory.memoryId,
          type: 'MEMORY',
          titleOrKey: memory.key,
          content: memory.content,
          finalScore,
          hybridScore,
          recencyMultiplier,
          freshnessMultiplier,
          memoryRecord: memory,
        });
      }
    }

    // 2. Process Authorized Knowledge Documents
    for (const doc of authorizedCandidates.documents) {
      const activeVersion = doc.getActiveVersion();
      const freshnessMultiplier = doc.freshness.getFreshnessMultiplier(now);

      // Explicit Guard: REVALIDATION_REQUIRED (0.0) excludes document from results
      if (freshnessMultiplier === 0.0) continue;

      const text =
        `${activeVersion.title} ${activeVersion.summary ?? ''} ${activeVersion.contentChunks.join(' ')}`.toLowerCase();
      const keywordScore = this.computeKeywordScore(queryTokens, text);
      const semanticScore = this.computeSemanticSimFallback(queryTokens, text);

      const hybridScore = semanticScore * wSemantic + keywordScore * wKeyword;
      const recencyMultiplier = this.computeRecencyMultiplier(
        activeVersion.createdAt,
        now,
        lambda,
      );

      const finalScore = hybridScore * recencyMultiplier * freshnessMultiplier;

      if (finalScore > 0) {
        results.push({
          id: doc.knowledgeId,
          type: 'KNOWLEDGE',
          titleOrKey: activeVersion.title,
          content: activeVersion.contentChunks.join('\n'),
          finalScore,
          hybridScore,
          recencyMultiplier,
          freshnessMultiplier,
          knowledgeDocument: doc,
        });
      }
    }

    // 3. Deterministic Sorting: (finalScore DESC, createdAt DESC, id ASC)
    results.sort((a, b) => {
      if (Math.abs(b.finalScore - a.finalScore) > 0.0001) {
        return b.finalScore - a.finalScore;
      }
      const aDate =
        a.memoryRecord?.createdAt ??
        a.knowledgeDocument?.createdAt ??
        new Date(0);
      const bDate =
        b.memoryRecord?.createdAt ??
        b.knowledgeDocument?.createdAt ??
        new Date(0);

      if (bDate.getTime() !== aDate.getTime()) {
        return bDate.getTime() - aDate.getTime();
      }
      return a.id.localeCompare(b.id);
    });

    return Object.freeze(results.slice(0, limit));
  }

  private computeKeywordScore(
    queryTokens: string[],
    targetText: string,
  ): number {
    if (queryTokens.length === 0) return 0;
    let matchCount = 0;
    for (const token of queryTokens) {
      if (targetText.includes(token)) {
        matchCount++;
      }
    }
    return matchCount / queryTokens.length;
  }

  private computeSemanticSimFallback(
    queryTokens: string[],
    targetText: string,
  ): number {
    if (queryTokens.length === 0) return 0;
    let score = 0;
    for (const token of queryTokens) {
      if (targetText.includes(token)) score += 0.8;
    }
    return Math.min(1.0, score / queryTokens.length);
  }

  private computeRecencyMultiplier(
    createdAt: Date,
    now: Date,
    lambda: number,
  ): number {
    const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
    const ageInDays = ageMs / (1000 * 60 * 60 * 24);
    return Math.exp(-lambda * ageInDays);
  }
}

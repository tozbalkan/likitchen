# ADR-005 AI Output Validation

**Status:** Accepted

## Context
LLMs are prone to hallucination, especially when generating complex structured data (JSON). Relying on the LLM to output valid JSON without a safety net risks crashing the Conversation Engine or corrupting the `ConversationState`.

## Decision
Every LLM response must successfully validate against the output contract before entering the Conversation Engine.

The pipeline is strictly defined as:

`LLM -> JSON Parse -> Zod Parse`

If validation fails:
1. **Retry Once:** The system automatically retries the LLM call exactly once.
2. **Route to Human:** If it fails a second time, the flow immediately aborts the AI loop and triggers a `route_to_human` recommendation.

We **NEVER** allow the engine to continue with a malformed JSON output.

## Consequences
- We never process malformed JSON.
- We never enter infinite retry loops.
- Corrupted extractions are safely handled without losing the customer.

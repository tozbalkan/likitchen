# AI Rules

## Rule #5 — Propose, Do Not Implement Unapproved

If an AI coding agent (or human developer) finds an improvement idea at the architecture or business rule level, they **do not implement it** — they propose it. Silently changing a threshold, a field name, or a layer boundary by saying "I also noticed...", "I improved...", or "I optimized..." violates this rule. The proposal must be added to the roadmap or directly asked to a human; it does not reflect in the code without approval.

## AI Boundaries

- **AI does not calculate:** The LLM does not write directly to any field outside of `ExtractedFacts`. `service_area_status`, `readiness`, `confidence`, `recommendation` — none of these are prompt outputs, they are calculated using deterministic functions.
- **Prompts do not contain business rules:** A business rule like "if the budget is over 60k, consider it priority" IS NOT WRITTEN in a prompt. Business rules live exclusively in pure functions inside `schema/conversation-facts-schema.ts`. The prompt only extracts information.
- **Resolver does not use AI:** `resolveServiceArea()`, `normalizeLocation()`, `lookupTown()` — none of these include an LLM call. The Location Resolver remains completely deterministic (it could be a fuzzy match or alias table, but the LLM is not asked "which town is this"). See ADR-003.

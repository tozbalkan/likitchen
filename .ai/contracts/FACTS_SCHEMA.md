# Facts Schema Contract

**Single Source of Truth:** `../../schema/conversation-facts-schema.ts` (Zod). Do not try to synchronize this file manually — the state machine, extraction prompt, and business rules are derived from this type.

## Required Fields (The only thing that stops the V1 flow)

- `project_type`
- `location_raw`

Every other field (`budget_range`, `timeline`, `attachments`, `is_homeowner`) is optional and does not stop the flow — it only affects the `confidence` score.

## Acceptance Rule

For every incoming message, regardless of what `stage` the conversation is in, the extraction layer scans **the entire schema** again. `stage` only determines "which question to ask next", it does not determine "which information is accepted". If the customer provides their budget out of order before being asked, this information is not lost.

## Location Edge Case

`location_raw` is always stored as free text ("Huntington", "11743", "near Cold Spring Harbor" — all are accepted). Normalizing and validating the service area is NOT the responsibility of extraction; it is the responsibility of the Resolver (`resolveServiceArea()`).

`service_area_status` is always one of three values:

- `supported`
- `unsupported`
- `unresolved` — town not recognized; **this must not be confused with "unsupported"**, because doing so could accidentally discard a good lead.

## The ONLY Field Group Touched by AI

The fields inside the `ExtractedFacts` schema. The LLM does not directly write values to any field in the `ResolvedFacts` and Business Decision layers (`service_area_status`, `readiness`, `confidence`, `recommendation`) — these are calculated strictly by deterministic functions (`calculateReadiness`, `calculateConfidence`, `getRecommendation`).

## Stubs That Must Be Implemented in V1

The code intentionally contains two functions that `throw` — these represent the actual implementation work of V1:

- `normalizeLocation(locationRaw)` — converts free text to a known town name (including typo correction).
- `lookupTown(normalizedTown)` — checks against the town->county->supported table in Supabase.

Without implementing these two, the system cannot perform service area checks.

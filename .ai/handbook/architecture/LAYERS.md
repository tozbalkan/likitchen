# Layers

## Four Structures, Four Responsibilities

| Structure | Where it is defined | Who populates it | When does it change |
|---|---|---|---|
| `ConversationState` | `schema/conversation-facts-schema.ts` | Conversation Engine | When conversation engine logic changes |
| `ExtractedFacts` | Same file | AI (LLM extraction) | When schema/conversation flow changes |
| `ResolvedFacts` | Same file | Location Resolver (deterministic) | When service area policy changes |
| Business Decision (Eligibility/Readiness/Confidence/Recommendation) | Same file | Pure functions, no AI | When business rules/weights change |

These four structures evolve independently. AI changes, Facts do not. Facts schema changes, Conversation State does not. Weights change, code does not (see `READINESS_WEIGHTS`).

## Why is Eligibility separate from Readiness?

When `service_area_status === "unsupported"`, `calculateReadiness()` returns `null` — NOT `0`. "This lead is low quality" and "this is not our customer" are different decisions from a business perspective (e.g., a customer with a $120K budget, ready to go, but located in Brooklyn — they are not low scoring, they are out of service area). In the `Recommendation` type, this distinction is reflected as `out_of_service_area` versus `low_priority`.

## Why does the Resolver have its own internal layers?

`resolveServiceArea()` appears as a single function from the outside, but internally it is split into `normalizeLocation()` -> `lookupTown()`. This allows us to add ZIP code, GPS/radius, or different service area policies in the future by changing only the internal steps, without changing the external interface.

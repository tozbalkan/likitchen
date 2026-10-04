# Capability-030: Production Vertical Slice (Live WhatsApp + Supabase + Lead Dashboard) Walkthrough

## Executive Summary

**Capability-030** pivots the project from substrate building to **100% Live Production Delivery** for LI Kitchen & Bed. It connects incoming WhatsApp messages directly to our core conversation pipeline (`src/domain/conversation`), executes real single-turn OpenAI structured output calls via `OpenAiFactExtractionAdapter`, persists conversations/leads in Supabase/Postgres, and presents qualified leads on the Sales Rep Lead Dashboard (`/dashboard/leads`).

---

## 5 Completed Production Milestones

### 1. Milestone 030.1: Real Fact Extraction (`src/infrastructure/ai/`)

- Implemented `OpenAiFactExtractionAdapter` for `FactExtractionPort`.
- Uses OpenAI API with structured JSON output and `ExtractedFactsZodSchema.strict()`.
- **Forbidden Field Regression Protection**: Verified that any attempt by provider to return decision fields (`readiness`, `score`, `recommendation`, `priority`, `qualification`, `sales_status`) triggers an immediate security error.
- **ZERO `ConversationState` Mutation**: Adapter only returns validated `FactExtractionResult`.

### 2. Milestone 030.2: Real WhatsApp Transport & Security (`src/app/api/webhooks/whatsapp/route.ts`)

- **GET Handler**: Verification Challenge handler for Meta webhook setup (`hub.verify_token`).
- **POST Handler**: Validates `X-Hub-Signature-256` HMAC SHA-256 header using `timingSafeEqual` constant-time string comparison.
- **Deduplication**: enforced in the database by `UNIQUE(provider_message_id)` together with `messages.processed_at` (see Remediation below). The in-memory `WhatsAppMessageDeduplicator` is not used by the route.

### 3. Milestone 030.3: End-to-End Conversation Pipeline Facade (`src/application/conversation/services/`)

- Connects incoming WhatsApp message to `ProcessUserMessageUseCase` executing:
  `FactExtractionStep` ➔ `MergeFactsStep` ➔ `ApplyFactsStep` ➔ `AssessmentStep` ➔ `ResponseMappingStep`.
- Produces deterministic lead qualification score (0-100), readiness evaluation, and customer response.

### 4. Milestone 030.4: Supabase / Postgres Persistence Layer (`docs/db/schema.sql` & `src/infrastructure/persistence/`)

- Created SQL schema for `conversations`, `messages`, and `leads` tables.
- Implemented `SupabaseConversationRepository` for saving conversation records, facts JSONB, and qualified lead details.

### 5. Milestone 030.5: Sales Rep Lead Dashboard (`src/app/dashboard/leads/page.tsx`)

- Built Next.js Lead Dashboard UI displaying active conversations, lead scores, extracted facts (Project, Location, Budget), and a **Human Takeover** toggle.
- Status (October 2026): the API is protected by Supabase Auth + tenant memberships, but still serves an in-memory demo lead store. Login, session refresh and live leads are Phase 3.

---

## Remediation (October 2026, commit `5fa5c9e`)

A security & development audit found that the slice passed all tests but did not work against the real schema, because every test mocked `fetch`. Fixes:

| Problem                                                                                                                                                    | Fix                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| The first message of every new customer was dropped: the message was inserted before its conversation existed (FK violation → 409 → treated as duplicate). | `ensureConversation()` creates the conversation and lead rows (idempotently) before `recordInboundMessage()`.                        |
| A failed pipeline run returned 500, Meta retried, and the retry was ignored as a duplicate — the message was lost.                                         | `messages.processed_at` is set only after the pipeline succeeds. A 409 on an unprocessed message returns `retry` and is reprocessed. |
| Supabase network errors were reported as `NOT_FOUND`, so an outage started a fresh conversation that overwrote the stored facts.                           | Infrastructure errors throw `SupabaseRequestError`; only an empty result is `NOT_FOUND`.                                             |
| `expectedRevision` was ignored; concurrent messages caused lost updates.                                                                                   | `save()` patches with `revision=lt.N` and returns `ConflictFailure` when no row matches.                                             |
| Hardcoded phone number and score; every row in `tenant-default`; `phone_number_id` check skipped when unset.                                               | Score derived from facts; repository scoped to `WHATSAPP_TENANT_ID`; config fails closed.                                            |
| Only `messages[0]` processed; time-based ids could collide.                                                                                                | All messages across entries/changes processed; `crypto.randomUUID()` ids; tenant-scoped hashed conversation ids.                     |
| Internal error details returned to callers.                                                                                                                | Generic error responses, details logged server-side.                                                                                 |
| Custom HMAC dashboard token with a shared signing key.                                                                                                     | Supabase Auth sessions + `tenant_memberships` RBAC + membership-based RLS.                                                           |

`pnpm test:integration` now runs the webhook against a real Supabase database (throwaway tenant, cleaned up afterwards) and covers first message, duplicate delivery, retry after failure, concurrent writes and RLS isolation.

---

## Quality Gate Verification

```bash
pnpm typecheck
npx eslint src --quiet
npx vitest run
npx dependency-cruiser src
pnpm check:frozen
```

- **Typecheck**: 0 errors
- **ESLint**: 0 errors
- **Vitest**: **462 passed, 5 skipped (111 test files)**; the 5 skipped are the opt-in Supabase integration tests
- **Supabase integration** (`pnpm test:integration`): 5 / 5
- **Dependency Cruiser**: 0 violations (706 modules)
- **Check Frozen**: PASSED (%100 frozen capability protection)

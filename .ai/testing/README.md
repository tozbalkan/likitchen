# Regression Scenarios

Each `conversation-NNN.md` file documents a sample WhatsApp conversation and the expected output from that conversation (ExtractedFacts, ResolvedFacts, Readiness, Confidence, Recommendation).

## What is the purpose of this folder?

When the model changes (OpenAI -> Anthropic -> Gemini), the prompt changes, or business rules are updated, all these scenarios are re-run. The expected output is compared against the actual output. If there is a difference, it is either an intentional behavior change (in which case the expected output is updated) or a regression (in which case we inspect the code/prompt).

This allows us to automatically verify 20-30 scenarios in 5 minutes instead of "manually re-testing the system".

## Format

Each file contains three sections:

1. **Conversation** — the raw text sequence of customer/AI messages, structured to include realistic problems (out-of-order info, hamlet names, switching to Spanish, refusing to provide budget, etc.).
2. **Expected Extracted Facts** — the JSON the LLM is expected to extract.
3. **Expected Resolution + Business Decision** — the result the Resolver and Business Rules are expected to produce (eligibility, readiness, confidence, recommendation).

## Scenario Categories Covered (Minimum Set for V1)

- [ ] `conversation-tests/001-standard-flow.md` — standard flow, answered in order.
- [ ] `conversation-tests/002-out-of-order.md` — customer breaks sequence (provides info early).
- [ ] `resolver-tests/003-hamlet-name.md` — hamlet/neighborhood name (not in town lookup, requires alias).
- [ ] `resolver-tests/004-out-of-service.md` — out of service area.
- [ ] `recommendation-tests/005-no-budget.md` — refuses budget / selects "not_sure".
- [ ] `conversation-tests/006-spanish-switch.md` — switching to Spanish (detected vs preferred language).
- [ ] `recommendation-tests/007-spam.md` — spam/nonsense messages (low confidence, required fields never fill).
- [ ] `recommendation-tests/008-followup-exhausted.md` — still low confidence after followup_count is exhausted (should route to human, not infinite loop).

These lists should grow with issues encountered in real conversations — do not bloat with hypothetical scenarios (Rule #3).

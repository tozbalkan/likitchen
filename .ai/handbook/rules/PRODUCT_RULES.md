# Product Rules

## The V1 Freeze Test

Before adding any new feature to V1, ask this question:

> **Can the customer reach us and be transferred to a sales representative without this feature?**

If the answer is **yes** -> it is not added; it is written to `roadmap/V2.md` or `roadmap/BACKLOG.md`.
If the answer is **no** -> it is a part of V1.

### Included in V1

- [x] WhatsApp conversation is recorded.
- [x] AI extracts necessary facts (Extracted Facts).
- [x] Location is resolved (Resolved Facts — service area supported/unsupported/unresolved).
- [x] Sales team can view the conversation (Project Workspace).
- [x] Photos are received.
- [x] Lead is routed to the correct person (Recommendation Engine).

### EXCLUDED from V1 (See Roadmap)

- [ ] AI kitchen design / AI Vision
- [ ] Price estimation / Estimate Builder
- [ ] Google/Outlook Calendar integration
- [ ] SMS
- [ ] PDF quote generation
- [ ] Dashboard charts / analytics
- [ ] Follow-up sequences, reminder engine
- [ ] Full attribution (Conversions API, offline conversion upload)

## Rule: Real User Validation

**No feature enters V1 unless it comes from a real user.**
"It might be useful" is not a justification for a feature. We do not invest architecture or code into hypothetical needs before real lead traffic arrives.

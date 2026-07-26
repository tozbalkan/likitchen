# DOMAIN IMPLEMENTATION AGENT

## Purpose

Implement deterministic business logic.

The Domain layer is the heart of the system.

It must never depend on:

- UI
- Next.js
- React
- Database
- AI
- Maps
- WhatsApp
- Email
- External APIs

---

## Before Every Response

Read:

1. \`.ai/README.md\`
2. \`.ai/WORKFLOW.md\`
3. \`IMPLEMENTATION_GUIDE.md\`
4. Relevant ADRs
5. Relevant Contracts
6. Relevant Rules

Then answer using exactly this structure.

## Documents Read

- ...

## Understanding

Briefly explain:

- what you are implementing
- where it belongs
- why it belongs there

## Layer Boundaries

State what this implementation may access.

Allowed:

- Domain
- Shared

Forbidden:

- Infrastructure
- Features
- React
- Providers
- Database

## Implementation Plan

Provide a numbered plan.

Do not write code yet.

Wait for approval.

---

## Domain Rules

Domain must be:

- deterministic
- pure
- synchronous whenever possible
- framework independent

No side effects.

No HTTP.

No database.

No logging.

No provider calls.

No environment variables.

---

## Naming

Prefer:

- Conversation
- ExtractedFacts
- ResolvedFacts
- Eligibility
- Confidence
- Readiness
- Recommendation
- WorkspaceProjection

Avoid abbreviations.

---

## Validation

Always validate contracts before implementation.

Never bypass Zod validation.

---

## Forbidden

Never:

- invent business rules
- modify contracts
- change documentation
- change ADRs
- introduce randomness
- read environment variables
- call APIs

If documentation is insufficient:

**STOP.**

Create an ADR proposal.
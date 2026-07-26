# Implementation Guide

Before writing code:

1. Read `.ai/README.md`
2. Read `.ai/GOVERNANCE.md`
3. Read relevant ADRs in `.ai/adr/`
4. Read the related contract in `.ai/contracts/`
5. Read the related specification in `.ai/prompts/specifications/`
6. Implement only what is documented.
7. Never introduce business rules into code if they are not defined in the Handbook.
8. Never bypass contracts.
9. Never change V1 behavior.
10. If documentation is insufficient, stop and create an ADR instead of guessing.
11. If a feature cannot be implemented without changing the Handbook, stop immediately. Do not invent architecture. Do not invent business rules. Create an ADR proposal instead.

## Folder Structure Rules
The `src/` directory must strictly follow this domain-driven separation:
- `src/app/`
- `src/application/` (commands/, queries/, use-cases/)
- `src/components/`
- `src/domain/` (conversation/, location/, recommendation/, workspace/, eligibility/, confidence/, readiness/, shared/)
- `src/features/`
- `src/infrastructure/`
  - `providers/` (ai/, messaging/whatsapp, messaging/email, maps/)
  - `adapters/`
  - `database/`
  - `telemetry/`
- `src/shared/` (config/, constants/, types/, utils/)

## Core First Principle
Implementation must begin with the internal business logic pipeline using mock data. External integrations (like WhatsApp or actual LLM API calls) are added last.

\`Conversation -> Conversation Engine -> Extracted Facts (Mock) -> Location Resolver -> Resolved Facts -> Business Rules -> Recommendation Engine -> Workspace Projection\`

*Workspace Projection Rule:* Workspace Projection is a read-only representation of the current conversation state. It never contains business logic and never mutates domain objects.

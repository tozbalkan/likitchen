---
agent: features-agent
capability: Capability-008
owner: Presentation
depends_on:
  - Capability-001
produces:
  - UI Components
next:
  - Capability-009
---
# Features Agent

Read first:
- core/00-operating-contract.md
- core/01-agent-response-format.md

## Mission
Implement UI and specific feature modules.

## Allowed
- Features
- Components
- App
- Shared
- Application (Commands/Queries)

## Forbidden
- Domain logic (direct mutation)
- Database calls (must go through Infrastructure)

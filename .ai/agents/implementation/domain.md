---
agent: domain-agent
capability: Capability-003
owner: Domain
depends_on:
  - Capability-002
produces:
  - Pure Business Logic
next:
  - Capability-007
---
# Domain Agent

Read first:
- core/00-operating-contract.md
- core/01-agent-response-format.md

## Mission
Implement deterministic business logic.

## Allowed
- Domain
- Shared

## Forbidden
- React
- Next.js
- Database
- Infrastructure
- Providers
- HTTP
- Environment variables

## Output
Only Domain implementation.

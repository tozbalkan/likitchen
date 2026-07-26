---
agent: contracts-agent
capability: Capability-002
owner: Domain
depends_on:
  - Capability-001
produces:
  - Zod Schemas
  - TS Types
next:
  - Capability-003
---
# Contracts Agent

Read first:
- core/00-operating-contract.md
- core/01-agent-response-format.md
- handbook/contracts/FACTS_SCHEMA.md
- handbook/contracts/LOCATION.md
- handbook/contracts/WORKSPACE.md
- handbook/contracts/EVENTS.md
- handbook/contracts/AI_OUTPUTS.md

## Mission
Implement Capability-002. Convert the handbook contracts strictly to Zod.

## Allowed
- install zod
- create .ts files inside src/domain/ or src/shared/ specifically for contracts
- export Types and Schemas
- define enums matching the Glossary

## Forbidden
- install any providers
- implement business rules (e.g., calculations)
- implement Application use cases
- implement Location Resolver or Recommendation Engine logic
- implement Infrastructure
- implement Features
- create API routes
- modify the Handbook

## Success Criteria
- pnpm install
- pnpm lint
- pnpm typecheck
- All handbook schemas have a corresponding Zod implementation
- No business logic

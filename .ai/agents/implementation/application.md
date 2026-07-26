---
agent: application-agent
capability: Capability-007
owner: Application
depends_on:
  - Capability-006
produces:
  - Orchestration Flow
  - Use Cases
next:
  - Capability-008
---
# Application Agent

Read first:
- core/00-operating-contract.md
- core/01-agent-response-format.md

## Mission
Implement use cases and orchestration.

## Allowed
- Domain
- Application
- Shared

## Forbidden
- Provider implementation
- Business decisions

---
agent: bootstrap-agent
capability: Capability-001
owner: Infrastructure
status: Active
depends_on: []
produces:
  - Next.js
  - Tooling
  - Folder Structure
next:
  - Capability-002
---
# Bootstrap Agent

Read first:
- core/00-operating-contract.md
- core/01-agent-response-format.md

## Mission
Implement Capability-001. Create the project skeleton. Nothing else.

## Allowed
- Initialize Next.js (pnpm dlx create-next-app)
- Configure TypeScript
- Configure ESLint
- Configure Prettier
- Configure Husky
- Configure Vanilla Extract
- Create the strict DDD directory structure

## Forbidden
- implement business logic
- implement contracts
- implement schemas
- implement domain objects
- implement application services
- implement providers
- implement adapters
- create API routes
- create React components
- create tests

## Success Criteria
Bootstrap is complete only if:
- Project builds
- TypeScript compiles
- ESLint passes
- Directory structure exists
- Git hooks work

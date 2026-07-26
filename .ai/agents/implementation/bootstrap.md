---
agent: bootstrap-agent
capability: Capability-001
owner: Infrastructure
status: Active
depends_on: []
produces:
  - Next.js Project
  - Tooling
  - Project Structure
next:
  - Capability-002
version: 1.0
handbook_version: 1.0
agent_version: 1.0
---

# Capability-001 · Bootstrap Agent

## Mission

You are responsible only for Capability-001 (Bootstrap).

This repository follows Documentation First Development.

The Handbook is the single source of truth.

You are not allowed to implement any capability other than Bootstrap.

Read the shared operating rules before doing anything.

Required:

- .ai/agents/core/00-operating-contract.md
- .ai/agents/core/01-agent-response-format.md

If documentation is insufficient:

STOP.

Do not guess.

Do not continue.

---

# Required Documentation

Read the following documents in order.

1. .ai/README.md
2. .ai/handbook/PHILOSOPHY.md
3. .ai/handbook/WORKFLOW.md
4. IMPLEMENTATION_GUIDE.md
5. .ai/handbook/GOVERNANCE.md
6. .ai/capabilities/capability-001.yaml
7. .ai/agents/implementation/bootstrap.md

Do not continue until every document has been reviewed.

---

# Capability Objective

Bootstrap the project.

Nothing else.

The output of this capability is a production-ready engineering foundation.

No business logic.

No contracts.

No providers.

No UI.

No APIs.

No tests.

No domain implementation.

---

# Scope

Implement only:

- Next.js 15
- TypeScript
- pnpm
- ESLint
- Prettier
- Husky
- lint-staged
- Vanilla Extract
- EditorConfig
- Import aliases
- Strict DDD folder structure

---

# Explicitly Out of Scope

Do not:

- install Zod
- implement Contracts
- implement Domain
- implement Application
- implement Infrastructure
- implement Features
- create React components
- create APIs
- create Providers
- create Database code
- create mock data
- write business logic

If you need any of these,

STOP.

Capability-001 is complete.

---

# Required Project Structure

Create only the architectural skeleton.

```
src/
├── app/
├── application/
│   ├── commands/
│   ├── queries/
│   └── use-cases/
├── components/
├── domain/
│   ├── conversation/
│   ├── location/
│   ├── eligibility/
│   ├── confidence/
│   ├── readiness/
│   ├── recommendation/
│   ├── workspace/
│   └── shared/
├── features/
├── infrastructure/
│   ├── providers/
│   ├── adapters/
│   ├── database/
│   └── telemetry/
└── shared/
    ├── config/
    ├── constants/
    ├── types/
    └── utils/
```

---

# Completion Criteria

Capability-001 is complete only if:

- Project initializes successfully.
- pnpm install succeeds.
- pnpm lint succeeds.
- pnpm typecheck succeeds.
- pnpm build succeeds.
- pnpm dev starts successfully.
- Vanilla Extract is configured.
- ESLint is configured.
- Prettier is configured.
- Husky is active.
- lint-staged is active.
- Path aliases work.
- Folder structure matches the Handbook.
- No placeholder files exist.
- No TODOs exist.
- No business logic exists.
- No additional capabilities were implemented.

When every criterion is satisfied,

STOP.

Mark Capability-001 as completed.

Do not continue with Capability-002.

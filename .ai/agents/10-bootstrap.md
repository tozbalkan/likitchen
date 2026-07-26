# Capability-001 · Bootstrap Agent

## Mission

Implement Capability-001 only.

Do not work on any other capability.

This repository follows Documentation First Development.

The Handbook is the single source of truth.

If documentation is insufficient:

STOP.

Do not guess.

Do not invent architecture.

Do not continue.

---

# Step 1

Read the documentation in this exact order.

1. .ai/README.md
2. .ai/handbook/PHILOSOPHY.md
3. .ai/handbook/WORKFLOW.md
4. IMPLEMENTATION_GUIDE.md
5. .ai/handbook/GOVERNANCE.md
6. .ai/agents/00-operating-contract.md
7. .ai/agents/10-bootstrap.md
8. .ai/capabilities/capability-001.yaml

Do not continue until every document has been reviewed.

---

# Step 2

Explain your understanding.

Include:

- Purpose of Capability-001
- Scope
- Out of scope
- Expected deliverables
- Definition of Done

Do not write code.

---

# Step 3

Validate Capability-001.

Verify that the Handbook contains enough information to complete Bootstrap.

Check:

- missing ADRs
- missing contracts
- missing documentation
- missing architectural decisions

If anything is missing:

STOP.

Produce a Documentation Gap Report.

Do not continue.

---

# Step 4

Produce an implementation plan.

Include:

1. CLI commands
2. Packages
3. Configuration changes
4. Folder structure
5. Files to create
6. Files to modify
7. Validation steps

No code yet.

Wait for approval.

---

# Step 5

After approval, execute Bootstrap.

The implementation must include ONLY:

- Next.js 15
- TypeScript
- pnpm
- ESLint
- Prettier
- Husky
- lint-staged
- Vanilla Extract
- .editorconfig
- Path aliases
- Strict DDD folder structure

Nothing else.

---

# Allowed

You may:

- initialize the project
- install tooling
- configure linting
- configure formatting
- configure Git hooks
- configure Vanilla Extract
- create folders
- update project configuration

---

# Forbidden

Do NOT:

- install Zod
- implement contracts
- implement business rules
- create React components
- create UI
- create APIs
- create providers
- create database code
- create tests
- implement Domain
- implement Application
- implement Infrastructure
- implement Features

Bootstrap only.

---

# Required Folder Structure

src/

app/

application/

commands/

queries/

use-cases/

components/

domain/

conversation/

location/

eligibility/

confidence/

readiness/

recommendation/

workspace/

shared/

features/

infrastructure/

providers/

database/

adapters/

telemetry/

shared/

config/

constants/

types/

utils/

---

# Validation

Bootstrap is complete only if all of the following succeed:

- pnpm install
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm dev

Additionally verify:

- Vanilla Extract is configured
- Path aliases work
- ESLint passes
- Prettier is configured
- Husky is active
- lint-staged is active

No placeholder files.

No TODOs.

No sample components.

No example code.

No business logic.

---

# Response Format

## Documentation Reviewed

...

## Capability Understanding

...

## Documentation Validation

...

## Implementation Plan

...

(Wait for approval)

After approval:

## Execution Summary

...

## Files Created

...

## Files Modified

...

## Validation Results

- pnpm install ✅
- pnpm lint ✅
- pnpm typecheck ✅
- pnpm build ✅
- pnpm dev ✅

## Capability Status

Capability-001 Completed

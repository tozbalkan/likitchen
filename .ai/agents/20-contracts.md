# Capability-002 · Contracts Agent

## Mission

Implement Capability-002 only.

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
7. .ai/agents/20-contracts.md
8. .ai/capabilities/capability-002.yaml
9. .ai/handbook/contracts/FACTS_SCHEMA.md
10. .ai/handbook/contracts/LOCATION.md
11. .ai/handbook/contracts/WORKSPACE.md
12. .ai/handbook/contracts/EVENTS.md
13. .ai/handbook/contracts/AI_OUTPUTS.md

Do not continue until every document has been reviewed.

---

# Step 2

Explain your understanding.

Include:

- Purpose of Capability-002
- Scope
- Out of scope
- Expected deliverables
- Definition of Done

Do not write code.

---

# Step 3

Validate Capability-002.

Verify that the Handbook contains enough information to complete Contracts.

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

1. CLI commands (e.g. installing Zod)
2. Packages
3. Configuration changes
4. Files to create
5. Files to modify
6. Validation steps

No code yet.

Wait for approval.

---

# Step 5

After approval, execute Contracts implementation.

The implementation must include ONLY:

- Zod schemas exactly matching the Handbook contracts
- Exported TypeScript types inferred from Zod
- Strict validation rules (e.g., `.strict()`, `.min(1)`)

Nothing else.

---

# Allowed

You may:

- install `zod`
- create `.ts` files inside `src/domain/` or `src/shared/` specifically for contracts
- export Types and Schemas
- define enums matching the Glossary

---

# Forbidden

Do NOT:

- install any providers
- implement business rules (e.g., calculations)
- implement Application use cases
- implement Location Resolver or Recommendation Engine logic
- implement Infrastructure
- implement Features
- create API routes
- modify the Handbook

Contracts only.

---

# Required Output

Zod schemas must be isolated from business logic, matching the Handbook structures exactly.

---

# Validation

Contracts are complete only if all of the following succeed:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- All handbook schemas have a corresponding Zod implementation

No placeholder files.
No TODOs.
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
- pnpm typecheck ✅
- pnpm lint ✅

## Capability Status

Capability-002 Completed
# BOOTSTRAP IMPLEMENTATION AGENT

## Purpose

Execute the project bootstrap phase based on the approved Implementation Plan.
You are the "Build" agent. Do not act until the "Think" agent (Planning) has provided a green light.

## Responsibilities

Implement only the following foundational setup:

- Next.js bootstrap (strictly `pnpm dlx create-next-app`)
- ESLint & Prettier setup
- Husky setup
- Vanilla Extract setup
- Implement strict Domain-Driven Directory Structure (`src/domain`, `src/application`, `src/infrastructure`, `src/shared`, `src/features`)
- Create an empty but structurally correct deterministic Mock Pipeline

## Rules

Before executing any command:

Verify that the command:

- does not modify the Handbook
- does not introduce business logic
- does not add providers
- does not add UI
- does not change contracts

If any answer is YES,

STOP.



- No UI components.
- No business logic implementation yet.
- No external provider integration.
- Ensure strict Next.js configuration without Tailwind.
- Do not create any file outside the boundaries defined in the Handbook.

## Required Response Format

Before writing code or running terminal commands, output exactly:

### Documentation Reviewed
(List the documents you read)

### Understanding
(Briefly explain what foundational pieces you are installing)

### Affected Layers
- Infrastructure (Tooling, Next.js Config)
- Shared (Directory Skeleton)

### Missing Documentation
(If any configuration detail is missing, STOP)

### Implementation Plan
(Step by step numbered plan of the exact CLI commands and files you will create)


## Completion Criteria

Bootstrap is complete only if:

- Project builds successfully.
- TypeScript compiles.
- ESLint passes.
- Directory structure matches the Handbook.
- No business logic exists.
- No external providers exist.
- No UI exists.
- Mock Pipeline entry point exists.

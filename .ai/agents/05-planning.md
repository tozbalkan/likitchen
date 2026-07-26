# Sprint 1 · Phase 01 · Bootstrap & Planning

You are joining an existing project.

This repository follows a strict Documentation First workflow.

Your job is NOT to write code.

Your job is to understand the repository and produce an implementation plan.

---

## Step 1

Read the documentation in the following order.

1. `.ai/README.md`
2. `.ai/PHILOSOPHY.md`
3. `.ai/WORKFLOW.md`
4. `IMPLEMENTATION_GUIDE.md`
5. `.ai/GOVERNANCE.md`
6. `.ai/architecture/`
7. `.ai/contracts/`
8. `.ai/rules/`
9. `.ai/adr/`
10. `.ai/prompts/`

Do not skip any document.

---

## Step 2

Explain your understanding of the system.

Include:

- Product purpose
- Core business flow
- Architecture
- Layer boundaries
- Domain concepts
- Deterministic pipeline
- V1 constraints

---

## Step 3

Review the documentation.

Identify:

- inconsistencies
- duplicated knowledge
- missing contracts
- missing ADRs
- unclear terminology
- broken boundaries

If documentation is sufficient, explicitly state that implementation may begin.

If not, stop and explain why.

Do not invent documentation.

---

## Boundary Validation

Identify:

- Which layer owns this feature?
- Which layer must NOT know about it?
- Which layer may depend on it?
- Which layer may never depend on it?

If ownership is unclear:

STOP.

Recommend an ADR.

---

## Step 4

Identify the implementation order.

Break Sprint 1 into small milestones.

Each milestone must have:

- Goal
- Expected output
- Dependencies
- Definition of Done

---

## Step 5

Review the proposed project structure.

Validate that every folder has a single responsibility.

Validate:

- `src/domain`
- `src/application`
- `src/infrastructure`
- `src/features`
- `src/shared`

Report any architectural concern.

---

## Step 6

Review every contract.

Verify that every contract can be implemented without ambiguity.

If a contract cannot be implemented exactly as written,
**STOP.**

Do not guess.

Recommend creating an ADR.

---

## Step 7

Produce the final implementation plan.

The plan must include:

- Sprint roadmap
- Execution order
- Potential risks
- Required contracts
- Expected deliverables

No code.

No pseudocode.

No file creation.

No implementation.

Only analysis and planning.

---

## Response Format

# Documents Read

...

# Architecture Understanding

...

# Documentation Review

...

# Risks

...

# Sprint 1 Roadmap

...

# Definition of Done

...

# Recommendation

Implementation Ready

or

Documentation Update Required

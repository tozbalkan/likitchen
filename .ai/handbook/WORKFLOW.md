# Development Workflow

This repository follows a strict Documentation First workflow.

Every implementation must follow the same sequence.

---

# Phase 1

Understand the problem.

Do not think about code.

Read:

- README
- GOVERNANCE
- IMPLEMENTATION_GUIDE
- ADRs
- Contracts
- Specifications

---

# Phase 2

Validate documentation.

Questions:

- Is the feature already documented?
- Does an ADR already exist?
- Does a Contract already exist?

If not,

STOP.

Create documentation first.

---

# Phase 3

Design implementation.

Produce an implementation plan.

No code.

---

# Phase 4

Implement.

Follow the plan.

Do not change architecture.

Do not introduce new business rules.

---

# Phase 5

Verify.

Run tests.

Validate contracts.

Verify deterministic behaviour.

---

# Phase 6

Review.

Review:

- Architecture
- Layer boundaries
- Contracts
- Naming
- Simplicity

---

# Phase 7

Complete.

Definition of Done:

- [ ] Handbook respected
- [ ] Contracts implemented
- [ ] Tests passing
- [ ] Deterministic behaviour
- [ ] No TODO
- [ ] No placeholder
- [ ] No undocumented behaviour

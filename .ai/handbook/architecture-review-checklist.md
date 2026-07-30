# Architecture Review Checklist (PR & Iteration Governance)

Every PR, capability iteration, or major code modification MUST be evaluated against this 10-point checklist prior to merging and freezing.

---

## PR Governance Checklist

- [ ] **1. No New Unapproved Dependencies**: Has any new external npm package or third-party framework dependency been added without an explicit ADR?
- [ ] **2. No Unintended Mutable State**: Are all newly added Value Objects, Domain Events, and Infrastructure Adapters deeply immutable (`Object.freeze`)?
- [ ] **3. Dispatcher Boundary Preserved**: Did `ToolDispatcher` remain 100% agnostic of tool selection, retries, caching, or LLM content formatting?
- [ ] **4. YAGNI Abstraction Check**: Is every new interface or class directly solving a current requirement rather than an unproven future scenario?
- [ ] **5. Strict Boundary Layering**: Does Domain or Application code remain 100% free of Infrastructure imports (`src/infrastructure/`)?
- [ ] **6. Exception Normalization**: Are all thrown exceptions derived from `AgentRuntimeError` or `ToolExecutionError` rather than raw `throw new Error(...)`?
- [ ] **7. Architecture Fitness & Contract Tests**: Have automated architecture tests (`architecture-decision.contract.test.ts`) been updated if new boundaries were introduced?
- [ ] **8. Public API Surface Snapshot**: Does the change preserve the public API surface without breaking `api-surface.snapshot.test.ts`?
- [ ] **9. Frozen Capability Isolation**: Did `pnpm check:frozen` pass with 0 modified lines across frozen capabilities (`024`, `025`, `026`, `027-I1`, `027-I2`)?
- [ ] **10. ADR Documentation Alignment**: Was a new ADR created or an existing ADR updated if architectural boundaries or contracts were modified?

---

## Governance Rules

- All 10 check items must be verified green before marking an iteration as **FROZEN**.
- Full 10-step deep architectural audits occur at major milestones (e.g. `v2.0` or every 5 capabilities).

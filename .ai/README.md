# Project Documentation Hub (.ai)

Welcome to the engineering handbook for LI Kitchen & Bed. This repository follows Documentation First Development.

Every engineering decision is documented before implementation. Documentation is the source of truth. Code is an implementation of documented decisions. 

## Navigation Map

| If you want to... | Read |
| --- | --- |
| Understand the project | \`PHILOSOPHY.md\` |
| Learn the architecture | \`architecture/\` |
| Implement a feature | \`IMPLEMENTATION_GUIDE.md\` |
| Understand business rules | \`rules/\` |
| Understand Agents | \`agents/\` |
| Understand data | \`contracts/\` |
| Review architecture | \`adr/\` |
| Start contributing | \`WORKFLOW.md\` |

---

## Documentation Modules

This handbook is divided into single-responsibility modules:

- **[PHILOSOPHY.md](PHILOSOPHY.md)**: The cultural manifesto of the project.
- **[WORKFLOW.md](WORKFLOW.md)**: The 7-phase daily development cycle.
- **[GOVERNANCE.md](GOVERNANCE.md)**: Product ownership, V1 Freeze rules, and versioning.
- **[IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md)**: Core rules before writing code, folder structures, and the "Core First" principle.
- **[architecture/](architecture/)**: How the system works (Layers, Data Flow, State Machine).
- **[contracts/](contracts/)**: The strict boundaries (Facts Schema, AI Outputs, Events).
- **[rules/](rules/)**: Constraints for the product, engineering, AI, and Anti-Patterns.
- **[testing/](testing/)**: Regression scenarios and test cases.
- **[examples/](examples/)**: Practical examples of inputs and outputs.
- **[reference/](reference/)**: Glossary, canonical naming, and engineering principles.
- **[adr/](adr/)**: Architecture Decision Records detailing why we didn't choose alternatives.
- **[agents/](agents/)**: The system agents provided to coding agents and the LLM.
- **[roadmap/](roadmap/)**: Feature queue and MVP definition.

---

## Golden Rule

**No new documentation unless implementation reveals a real gap.**

This directory is now frozen. A good handbook must be as stable as it is comprehensive. New features or architecture updates must go through the ADR proposal process. If you encounter a gap during implementation, you must stop, create an ADR, and update the handbook before continuing.

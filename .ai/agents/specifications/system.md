# System Prompt Specification

**Question Answered:** What is the core persona and operational boundary of the AI?

## Purpose
To define the overarching persona, tone, and strict boundaries of the AI assistant.

## Responsibilities
- Establish a professional, helpful, and concise tone.
- Prevent the AI from answering off-topic questions or engaging in non-business discussions.

## Inputs
- Global system context.

## Outputs
- Implicit behavioral alignment for all subsequent interactions.

## Constraints
- Must never negotiate prices or make definitive guarantees.
- Must strictly stay within the domain of kitchen and bath remodeling.
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: AI politely redirects a question about cooking recipes back to kitchen remodeling.
- *Failure*: AI provides cooking advice.

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

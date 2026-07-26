# Recommendation Prompt Specification

**Question Answered:** How is the next action determined?

## Purpose
To analyze the current state of facts and determine the immediate next step for the AI to take (if delegated to the LLM layer rather than deterministic code).

## Responsibilities
- Output a categorical recommendation based on provided state context.

## Inputs
- Current conversation state and gathered facts.

## Outputs
- An action category (e.g., ask_followup, route_to_human).

## Constraints
- MUST NOT calculate Readiness or Confidence scores.
- MUST NOT apply business logic to determine service eligibility.
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: Outputs `ask_followup` when required fields are missing.

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

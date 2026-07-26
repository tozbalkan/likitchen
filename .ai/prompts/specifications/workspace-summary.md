# Workspace Summary Prompt Specification

**Question Answered:** How is the internal summary generated?

## Purpose
To create a concise, readable summary of the lead for the sales team.

## Responsibilities
- Synthesize the entire conversation history and extracted facts into a 2-3 sentence summary.

## Inputs
- Conversation history.
- Extracted facts.

## Outputs
- A short text summary.

## Constraints
- Must be objective and concise.
- Must not include raw JSON or technical details.
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: "Customer is looking for a full kitchen remodel in Brooklyn within 3-6 months. Budget is undetermined."

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

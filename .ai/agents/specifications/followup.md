# Follow-up Prompt Specification

**Question Answered:** How are follow-up questions formulated when confidence is low?

## Purpose
To generate clarifying questions when extracted data is ambiguous or incomplete.

## Responsibilities
- Identify the ambiguity in the extracted facts.
- Formulate a polite, targeted question to resolve the ambiguity.

## Inputs
- Ambiguous or low-confidence facts.
- Conversation history.

## Outputs
- A clarifying natural language question.

## Constraints
- Must ask only one question at a time.
- Must not repeat previous questions verbatim.
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: "Could you clarify if you mean Brooklyn, NY?"

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

# Translation Prompt Specification

**Question Answered:** How are multilingual conversations handled?

## Purpose
To ensure the AI responds in the customer's preferred language without losing persona context.

## Responsibilities
- Detect the customer's language.
- Translate system intents and questions into the target language naturally.

## Inputs
- Customer message.
- System generated response (in base language).

## Outputs
- Translated natural language response.

## Constraints
- Must maintain the professional and empathetic tone of the persona.
- Must not attempt to translate technical schema keys.
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: Responds in Spanish when the customer writes in Spanish.

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

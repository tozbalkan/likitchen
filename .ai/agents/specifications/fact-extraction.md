# Fact Extraction Prompt Specification

**Question Answered:** How are structured facts extracted from a conversation?

## Purpose
To parse the natural language conversation and extract structured data conforming to the schema.

## Responsibilities
- Identify specific entities (location, budget, timeline, project type) from customer messages.
- Map these entities strictly to the defined schema.

## Inputs
- Conversation transcript.

## Outputs
- JSON object conforming to the ExtractedFacts schema.

## Constraints
- MUST NOT guess or infer missing information.
- MUST NOT normalize data (e.g., location strings must remain raw).
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: Extracts `location_raw: "Brooklyn"` from "I live in Brooklyn".
- *Failure*: Infers `budget_range: "high"` because the customer wants "luxury".

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

# Location Resolver Prompt Specification

**Question Answered:** How is a customer location normalized and resolved?

## Purpose
To clean up raw location text provided by the customer for backend lookup.

## Responsibilities
- Fix typos in city/town names.
- Remove conversational filler from location strings (e.g., "I live near...").

## Inputs
- `location_raw` string.

## Outputs
- A normalized town/city name string.

## Constraints
- MUST NOT determine if the location is within the service area (that is a backend lookup responsibility).
- MUST NOT return a value if the location is completely ambiguous.
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: "I am located in Bronx" -> "Bronx".

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

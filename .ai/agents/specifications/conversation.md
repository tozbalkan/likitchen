# Conversation Prompt Specification

**Question Answered:** How should the AI conduct a customer conversation?

## Purpose
To guide the AI in generating natural, empathetic, and goal-oriented responses to the customer.

## Responsibilities
- Acknowledge the customer's statements.
- Formulate exactly one clear question to move the conversation forward based on missing information.

## Inputs
- Customer message history.
- Current missing fields to be gathered.

## Outputs
- A natural language response to the customer.

## Constraints
- Must not overwhelm the customer with multiple questions at once.
- Must not sound robotic or overly transactional.
- Must not contain business rules, scoring logic, or definitions for Readiness/Confidence.
- Must not assume a specific AI provider.

## Failure Cases
- The AI hallucinates fields not present in the input.
- The AI breaks JSON or structured format constraints.
- The AI fails to adhere to boundaries.

## Examples
- *Success*: "That sounds like a great project! What timeline did you have in mind?"

## Related Documentation
- **Contracts**: [FACTS_SCHEMA.md](../../contracts/FACTS_SCHEMA.md), [AI_OUTPUTS.md](../../contracts/AI_OUTPUTS.md)
- **Architecture**: [SYSTEM_OVERVIEW.md](../../architecture/SYSTEM_OVERVIEW.md), [DATA_FLOW.md](../../architecture/DATA_FLOW.md)
- **Rules**: [PRODUCT_RULES.md](../../rules/PRODUCT_RULES.md), [AI_RULES.md](../../rules/AI_RULES.md)
- **ADRs**: [ADR-000](../../adr/ADR-000-repository-philosophy.md)

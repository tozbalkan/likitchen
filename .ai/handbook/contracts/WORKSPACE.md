# Project Workspace Contract

The Project Workspace (Dashboard) is the single pane of glass for the sales team. It displays a unified view of the Lead, aggregating data from the Conversation Engine, the Resolver, and Business Rules.

## Data Contract

The UI expects the following payload:

- **Conversation**: Full transcript of the user-AI interaction.
- **Summary**: LLM-generated concise summary of the lead.
- **Facts**: The unified `ConversationFacts` (Extracted + Resolved).
- **Readiness**: Deterministic score.
- **Confidence**: Deterministic completeness score.
- **Recommendation**: Output from `getRecommendation()` (ask_followup, route_to_human, low_priority, out_of_service_area).
- **Status**: Current status of the lead.
- **Timeline**: Standardized timeline value.
- **Photos**: Array of parsed attachments (URLs).
- **Source**: Where the lead originated (e.g., WhatsApp, Website).
- **Campaign**: Marketing campaign attribution (UTM data, if applicable).
- **Assigned User**: Sales representative handling the lead.
- **Notes**: Internal notes from the sales team.

## Rules
- The Workspace is **READ-ONLY** for derived fields (`Readiness`, `Recommendation`).
- It does not calculate scores itself; it only displays them.

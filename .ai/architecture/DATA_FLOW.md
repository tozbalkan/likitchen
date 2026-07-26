# Data Flow

## High-Level Flow

```
Website
  |
WhatsApp
  |
Conversation Engine   <- ConversationState (stage, followup_count, status)
  |
Fact Extraction       <- THE ONLY LAYER TOUCHED BY AI (Extracted Facts)
  |
Resolver              <- Deterministic lookup (Resolved Facts)
  |
Business Rules        <- Deterministic rules (Eligibility, Readiness, Confidence, Recommendation) — NO AI
  |
Persistence           <- Supabase — ConversationState + Facts + Results are stored here
  |
Project Workspace
  |
Human
```

*Note: Formal layers such as "Presentation" and "Infrastructure" are intentionally omitted here — no UI code has been written yet, and documenting them now would detach the documentation from reality. This diagram will be updated once the Project Workspace UI construction begins.*

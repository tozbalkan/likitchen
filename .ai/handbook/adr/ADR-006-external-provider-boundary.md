# ADR-006 External Provider Boundary

**Status:** Accepted

## Context
The system integrates with multiple external providers, including Meta Cloud API (WhatsApp) and various LLM providers (OpenAI, Anthropic, Gemini). Coupling our core business logic to the specific payload structures of these providers makes the system fragile and hard to migrate.

## Decision
External providers (Meta, OpenAI, Anthropic, Google) **never** communicate directly with the business domain.

Every provider must pass through an Adapter Layer that converts external payloads into internal contracts.

- **WhatsApp Webhook:** `Incoming Message -> Normalize Adapter -> ConversationEvent -> Conversation Engine`
- **LLM Output:** `Provider JSON -> Normalization Adapter -> AI_OUTPUT Contract -> Conversation Engine`

## Consequences
- Replacing Meta with Twilio requires only a new Adapter.
- Replacing OpenAI with Anthropic requires only a new Adapter.
- Core domain logic remains completely unaware of external provider APIs.

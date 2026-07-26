# Architecture Decision Records (ADR)

The ADRs in this folder do not repeat `architecture/SYSTEM_OVERVIEW.md`. Every ADR documents a **rejected alternative** that was actually evaluated, and the rationale for rejecting it. The goal is so that when someone asks "why X and not Y?" six months later, we don't have to re-have that debate.

| ADR | Decision | Rejected Alternative |
|---|---|---|
| [ADR-000](./ADR-000-repository-philosophy.md) | Repository Philosophy | N/A |
| [ADR-001](./001-custom-workspace-not-crm.md) | Custom "Project Workspace" | Zoho, HubSpot |
| [ADR-002](./002-meta-cloud-api-direct.md) | Meta Cloud API (direct) | Twilio, 360dialog |
| [ADR-003](./003-town-lookup-not-geocoding.md) | Town lookup table (V1) | ZIP + geocoding + radius |
| [ADR-004](./004-deterministic-readiness.md) | Deterministic Readiness Engine | LLM generating score directly |

## When is a new ADR added?

Only when a real alternative is evaluated and rejected. "We did it this way" alone is not a justification for an ADR — the architecture documents already explain that. The reason an ADR exists is to record the path NOT taken, and why it wasn't taken.

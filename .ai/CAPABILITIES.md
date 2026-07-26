# Capability Map

## Capability-001
**Bootstrap**
Status: Pending
Depends on: None
Produces:
- Next.js project
- Tooling
- Folder structure

---

## Capability-002
**Contracts**
Status: Pending
Depends on: Capability-001
Produces:
- Zod contracts
- DTOs
- Validation

---

## Capability-003
**Conversation Domain**
Status: Pending
Depends on: Capability-002
Produces:
- State Machine
- ExtractedFacts Interface

---

## Capability-004
**Location Resolver**
Status: Pending
Depends on: Capability-003
Produces:
- Location Resolution Logic
- ResolvedFacts

---

## Capability-005
**Recommendation Engine**
Status: Pending
Depends on: Capability-004
Produces:
- Eligibility rules
- Confidence score calculation
- Readiness score
- Final Recommendation

---

## Capability-006
**Workspace Projection**
Status: Pending
Depends on: Capability-005
Produces:
- Read-only Workspace view model

---

## Capability-007
**Application Use Cases**
Status: Pending
Depends on: Capability-006
Produces:
- Command and Query handlers
- Orchestration flow

---

## Capability-008
**Website**
Status: Pending
Depends on: Capability-001
Produces:
- Public landing page

---

## Capability-009
**AI Providers**
Status: Pending
Depends on: Capability-007
Produces:
- Infrastructure Adapters (OpenAI, Anthropic)

---

## Capability-010
**WhatsApp**
Status: Pending
Depends on: Capability-007
Produces:
- Meta API webhook adapter

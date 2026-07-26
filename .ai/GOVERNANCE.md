# Governance

This document outlines the core governance rules for the repository.

## Documentation First
Every engineering decision must be documented before implementation. Code is merely the manifestation of agreed-upon contracts and architecture.

## V1 Freeze
Once the architecture and contracts for V1 are finalized, they enter a freeze state. Any changes to the V1 scope require a formal ADR.

## ADR Process
Architecture Decision Records (ADRs) are required for any significant change in architecture, dependencies, or product behavior. See `.ai/adr/README.md`.

## Breaking Change Policy
Breaking changes to AI contracts or database schemas must go through a deprecation phase (e.g., V1 to V2). We do not silently break existing systems.

## Versioning
We follow Semantic Versioning (SemVer). 

## Decision Ownership
Technical decisions are owned by the Engineering Lead. Product decisions are owned by the Product Manager. Documentation resolves disputes.

## Definition of Done
A feature is "Done" when:
1. It matches the specification and contract.
2. The runtime AI prompt (if any) performs reliably.
3. Tests pass.
4. It is deployed and verified in staging.

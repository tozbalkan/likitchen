# ADR-009: Dependency Direction

## Status

Accepted

## Context

A layered architecture requires strict enforcement of dependency flow. If upper layers (like Features) leak into lower layers (like Domain or Shared), the architecture becomes coupled, making it hard to test, scale, and refactor.

## Decision

We formally adopt the Clean Architecture dependency direction. The absolute hierarchy is:

```
Shared
  ↑
Domain
  ↑
Application
  ↑
Features
  ↑
App
```

### Rules

1. **Dependencies always point inward.** Lower layers never import upper layers.
2. **Domain has no knowledge of Application.** `src/domain` must never import anything from `src/application`.
3. **Shared has no knowledge of Domain.** `src/shared` is purely infrastructural/utility code and cannot import `src/domain` concepts.
4. **Features communicate through public APIs only.** Features import from `domain` or `application` via their respective `index.ts` barrel files.
5. **Enforcement:** Circular dependencies and backwards imports must be strictly monitored in CI (e.g., using `dependency-cruiser` or `madge`).

## Consequences

- **Pros**: The core domain remains pure and untainted by presentation or integration logic. Testing becomes easier as lower layers have fewer dependencies.
- **Cons**: Requires strict discipline and automated tooling to prevent engineers from making "quick fixes" that break the dependency direction.

# ADR-008: Public API & Barrel Export Policy

## Status

Accepted

## Context

As the codebase grows, deep imports (e.g., `import { X } from "../../domain/conversation/conversation-facts-schema"`) create tight coupling. It becomes difficult to refactor internal implementations of a domain because other parts of the application depend on the specific file paths.

## Decision

We enforce a strict **Public API & Barrel Export Policy** across all domains and application layers.

1. **Index-Only Imports**
   - Every module (e.g., `src/domain/conversation`, `src/application/ai/contracts`) must have an `index.ts` file acting as the barrel export.
   - Any code outside the owning module must import from the `index.ts` file.
   - No cross-module deep imports are allowed.

2. **No Implementation Imports**
   - External consumers must never import internal implementation details (e.g., helper functions or raw Zod schemas).
   - Only the defined public surface (e.g., `parseX`, `safeParseX`, the `ReadonlyDeep<X>` type) is exposed.

3. **Contract Ownership & Boundary Enforcement**
   - This approach ensures that a module fully owns its contracts and implementations.
   - Refactoring the internal files of a module (like splitting schemas into multiple files) will not break consumers, provided the `index.ts` continues to export the expected Public API.

## Consequences

- **Pros**: Clear module boundaries, easier refactoring, prevents spaghetti code, and explicitly defines the public interface of every bounded context.
- **Cons**: Requires discipline to maintain `index.ts` files and tooling (like ESLint rules) to automatically enforce the import paths.

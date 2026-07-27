# ADR-012: Ports & Adapters Policy

## Status

Accepted

## Context

To prevent framework lock-in and vendor coupling (e.g. Supabase, Next.js, external APIs), we need strict boundaries between our application core and external systems.

## Decision

We implement a strict Ports and Adapters (Hexagonal) Architecture.

1. **Application Only Consumes Ports**: The Application layer defines interfaces (`Ports`) for everything it needs (Repositories, Caching, Location Lookups, Clock, UUIDs). It never imports from `src/infrastructure` or external libraries directly.
2. **Infrastructure Only Implements Ports**: The Infrastructure layer provides the concretions (`Adapters`) for these interfaces.
3. **Domain Remains Ignorant**: The Domain layer knows nothing of either. It receives entities and returns decisions.
4. **Mapping at the Boundary**: Infrastructure must never alter the Domain model. Any external data format must be mapped into Domain/Application objects at the very boundary (Infrastructure layer) before being passed inward.
5. **No Framework Types Leakage**: Framework types (e.g., `NextRequest`, `PrismaClient`, `ZodError`, `SupabaseClient`) are strictly forbidden outside of the Infrastructure layer. Public APIs (Domain and Application interfaces) must only expose pure TypeScript models.

## Consequences

- **Pros**: The system is completely agnostic to external tools. Changing from Supabase to a custom PostgreSQL backend, or from Next.js to Express, requires zero changes to the Domain or Application layers.
- **Cons**: Requires writing mappers to translate between raw database shapes and domain entities, increasing the overall file count.

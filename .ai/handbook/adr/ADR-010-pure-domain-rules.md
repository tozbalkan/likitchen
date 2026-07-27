# ADR-010: Pure Domain Rules

## Status

Accepted

## Context

As the business logic inside the Conversation Domain grows (e.g. routing rules, scoring algorithms, stage transitions), it is extremely easy to accidentally couple this logic to data-fetching mechanisms, databases, or external services.

## Decision

We enforce that the **Domain defines policy, never data.**
To guarantee this, all domain logic must strictly adhere to the following rules:

1. **Deterministic Logic Only**: Domain functions must always return the exact same output for the same input.
2. **No Provider Dependency**: No imports from third-party services (e.g. Supabase client, OpenAI client, Google Maps SDK).
3. **No Database Lookup**: Domain entities do not fetch their own data. They operate purely on data passed to them.
4. **No HTTP**: No `fetch` or network calls.
5. **No Filesystem**: No I/O operations.
6. **No Clock**: Time-dependent logic must take `now: Date` as an input parameter.
7. **No Randomness**: No `Math.random()` or UUID generation inside domain rules unless seeded/injected.

### Layer Responsibilities

- **Domain**: Knows the rules and policies.
- **Application**: Knows the flow and orchestrates the steps.
- **Infrastructure**: Knows the data and external details.

## Consequences

- **Pros**: Domain logic is highly testable (100% branch coverage is trivial), portable, and predictable.
- **Cons**: Requires setting up orchestrators (Application layer) and interfaces to inject data into the Domain, which adds some boilerplate.

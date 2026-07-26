# TESTING AGENT

## Rules
Every test must verify deterministic behaviour.
The same input must always produce the same output.

Every deterministic rule must have at least one test.
Every state transition must have at least one test.

Never mock Domain logic.
Mock only external providers.

Prefer integration tests over implementation-detail tests.
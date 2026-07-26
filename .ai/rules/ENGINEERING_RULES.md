# Engineering Rules

## Rule #1 — Product Decisions Are Not Made While Coding

The worst scope creep happens when the IDE is open, triggered by a reflex of "let's add this too". If a new feature idea is born while writing code, **it is not written** — it is added to the roadmap and left for separate evaluation.

## Rule #3 — A Problem Is Not Solved Until It Occurs Twice

A single request is a signal, not a problem. We look for recurring signals coming from multiple sources.

**Exception:** This rule is for feature requests. Irreversible risks or security/data integrity issues (e.g., mass rejection of a WhatsApp template, data going to the wrong person) are exempt from this rule — we intervene at the first signal.

## Rule #4 — Architecture Supports the Future, Product Solves Today

Code is written to expand in the future (e.g., `Recommendation` is a discriminated union — adding a new decision type does not touch other layers). However, the feature set the product offers today is limited strictly to the V1 Freeze list. Do not confuse the two — "extensible architecture" is not the same as "building everything right now."

## Rule #6 — Every Business Rule Has Exactly One Owner

A calculation (e.g., Readiness score) cannot be calculated in multiple places within the system. Only `calculateReadiness()` calculates it — the Project Workspace UI, Resolver, or a prompt do not redo the same calculation; they only display or use the result. The same rule applies to all deterministic functions (`calculateConfidence`, `getRecommendation`, `resolveServiceArea`). This eliminates the class of bugs caused by "the same logic was updated differently in two places."

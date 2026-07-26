# Anti-Patterns

`rules/` directories explain what should be done. This file explains what should NOT be done. It is possible to read positive rules and still write code in the wrong place — this file closes that gap.

## ❌ UI Calculating Readiness

The Project Workspace UI DOES NOT calculate `readiness`/`confidence`/`recommendation` values itself — it only displays the result returned by `getRecommendation()`. If logic like "if photo count > 0 then +10 points" is seen in the UI, it has been written in the wrong place.

## ❌ Workspace Managing State

Information about which `stage` the conversation is in, or `followup_count`, belongs to `ConversationState`. The Project Workspace UI does not store or change these on its own; it only reads them.

## ❌ Provider-Specific Code Assuming "GPT today, Claude tomorrow"

The extraction layer must be unaware of which LLM provider is being used. If a provider-specific API detail (e.g., the function-calling format of a specific model) leaks into the extraction logic, the cost of switching providers increases — which is exactly what we are trying to prevent.

## ❌ Sneaking in a V1 Freeze feature as a "small addition"

The reflex of "since I'm already here, let me add this too" is the most insidious form of scope creep. Regardless of size, no unapproved feature is added.

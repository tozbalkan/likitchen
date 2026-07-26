# AI Output Contract

The Conversation Engine depends on a strict, predictable JSON output from the LLM extraction layer. The LLM must always return exactly this structure, regardless of the provider (OpenAI, Anthropic, Gemini).

## Schema Definition

```json
{
  "extractedFacts": {
    // ExtractedFacts schema defined in conversation-facts-schema.ts
  },
  "confidence": {
    // Extraction certainty (distinguished from the deterministic Completeness score)
  },
  "missingInformation": [
    // Array of string keys indicating what is still needed
  ],
  "suggestedFollowup": null, // The exact next question to ask the user, or null if complete
  "notes": "" // A brief internal summary of the turn
}
```

## Rules
- The Conversation Engine parses this JSON strictly via Zod.
- If `extractedFacts` is provided, it updates the central state.
- `suggestedFollowup` is only utilized if `followup_count` allows it (managed deterministically by the engine).

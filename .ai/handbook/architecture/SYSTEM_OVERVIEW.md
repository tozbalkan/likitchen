# System Overview

## Stability Hierarchy — What Can Change, What Cannot

This diagram illustrates the stability of different parts of the system, showing what can change easily versus what is hard to change.

```
Business Decisions   <- Most stable (rarely changes; if it does, it's a conscious product decision)
  |
Business Rules       <- Weights/thresholds can change, the core logic structure does not
  |
Code                 <- Implementation details
  |
Framework            <- Most volatile (Next.js or Supabase could be replaced, but business rules remain)
```

**Practical Consequence:** A framework or library change can never be the justification to change a business rule. However, the reverse can happen — a business rule change might sometimes make us question the framework choice.

**Core Principle:** AI is NOT the center of the system; it is just one component. Everything outside the Fact Extraction layer is deterministic, testable, and explicitly defined in code. If the LLM provider changes tomorrow (OpenAI -> Anthropic -> Gemini), this change only affects the extraction layer — the Resolver, Business Rules, and Project Workspace remain completely untouched.

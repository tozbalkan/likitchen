# State Machine

## Why is `ConversationState` Separate?

Fields like `followup_count`, `stage`, and `status` are not information extracted from the conversation — they are the engine's own state. If they were kept inside `ExtractedFacts`, the engine logic and the data contract would be mixed together.

The state machine uses `stage` to dictate which question comes next, but it DOES NOT dictate what information is accepted. Extraction happens on the entire schema for every turn, ensuring that if a user provides out-of-order information (like giving a budget early), it is captured.

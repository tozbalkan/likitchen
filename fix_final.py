def fix():
    # 1. semantic-normalizer.ts
    path = "src/application/ai/normalization/semantic-normalizer.ts"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace(
        "const result = JSON.parse(JSON.stringify(contract)) as unknown as Record<string, unknown>;",
        "const result = JSON.parse(JSON.stringify(contract)) as AiOutput;"
    )
    content = content.replace(
        "const facts = result.extractedFacts as Record<string, unknown> | undefined;",
        ""
    )
    content = content.replace("if (facts) {", "if (result.extractedFacts) {")
    content = content.replace("if (facts.location_raw) {", "if (result.extractedFacts.location_raw) {")
    content = content.replace("facts.service_area_status = \"unresolved\";", "")
    content = content.replace("facts.location_raw = (facts.location_raw as string).trim();", "result.extractedFacts.location_raw = this.cleanString(result.extractedFacts.location_raw);")
    content = content.replace("return ok(result as unknown as AiOutput);", "return result;")

    with open(path, "w") as f:
        f.write(content)

    # 2. persist.step.ts
    path = "src/application/conversation/use-cases/process-user-message/steps/persist.step.ts"
    with open(path, "r") as f:
        content = f.read()
    content = content.replace("(stores as Record<string, unknown>).conversation", "stores.conversation")
    content = content.replace("(e as any).code", "(e as Record<string, unknown>).code")
    content = content.replace("const code = (e as Record<string, unknown>).code;", "const code = (e as {code?: string}).code;")
    with open(path, "w") as f:
        f.write(content)

    # 3. event-dispatcher.ts
    path = "src/application/ports/event-dispatcher.ts"
    with open(path, "r") as f:
        content = f.read()
    content = content.replace("DomainEvent<string, Record<string, unknown>>", "DomainEvent<string, unknown>") # Or whatever the type was
    # Actually wait, event-dispatcher.ts was complaining about DomainEvent<string, unknown>. Let's revert it back to any since it's just an interface and the ESLint rule might be disabled for it, or let's use `never`.
    # It says Type 'unknown' does not satisfy the constraint 'string'.
    # Oh! `DomainEvent<TContext extends string, TPayload>` ?
    # Let me just check what event-dispatcher requires.
    
fix()

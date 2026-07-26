# Documentation Refactoring Report

This report documents the structural changes made during the transformation of the repository's documentation into a professional engineering handbook.

## Files Moved / Renamed
- `.ai/architecture.md` -> `.ai/architecture/SYSTEM_OVERVIEW.md`
- `.ai/schema-contract.md` -> `.ai/contracts/FACTS_SCHEMA.md`
- `.ai/rules.md` -> `.ai/rules/PRODUCT_RULES.md`
- `.ai/roadmap.md` -> `.ai/roadmap/ROADMAP.md`
- `.prompt/fact-extraction.md` -> `.ai/prompts/fact-extraction.md`
- `files2/mnt/user-data/outputs/li-kitchen-bed/.ai/adr/README.md` -> `.ai/adr/README.md`
- `files2/mnt/user-data/outputs/li-kitchen-bed/.ai/testing/README.md` -> `.ai/testing/README.md`

## Files Merged & Split
- **Architecture**: `files2/architecture.md` was split into `.ai/architecture/SYSTEM_OVERVIEW.md`, `LAYERS.md`, `DATA_FLOW.md`, and `STATE_MACHINE.md`.
- **Rules**: `files2/rules.md` and `files2/ANTI_PATTERNS.md` were split and merged into `.ai/rules/PRODUCT_RULES.md`, `ENGINEERING_RULES.md`, `AI_RULES.md`, and `ANTI_PATTERNS.md`.
- **Roadmap**: `.ai/roadmap.md` was broken down into `roadmap/MVP.md`, `V2.md`, and `BACKLOG.md`.

## Files Deleted (Duplicates Removed)
- `files/` directory (contained duplicate copies of all root `.ai` files).
- `files2/` directory (contained duplicate or fragmented files after their unique content was migrated).
- `.prompt/` directory (migrated into `.ai/prompts/`).

## Directories & Placeholders Created
- `.ai/product/` with `PRODUCT.md` and `BUSINESS.md` (placeholders created with TODOs).
- `.ai/reference/` with `GLOSSARY.md`, `NAMING.md`, and `PRINCIPLES.md` (populated with canonical terminology).
- `.ai/testing/` layout established (`conversation-tests`, `resolver-tests`, etc.).
- `.ai/examples/` layout established (`conversation`, `resolver`, etc.).
- `.ai/contracts/` layout established (`AI_OUTPUTS.md`, `EVENTS.md` placeholders).
- `.ai/adr/ADR-000-repository-philosophy.md` placeholder.

## Broken Links Fixed
- The main `.ai/README.md` was rewritten to act as a definitive index, linking correctly to all the newly moved modules, ensuring no orphan documents exist.
- Internal references inside the migrated documents were updated to point to the new structure.

## Remaining TODOs & Human Review Required
- Fill out the product description in `.ai/product/PRODUCT.md` and `.ai/product/BUSINESS.md`.
- Populate the Glossary in `.ai/reference/GLOSSARY.md`.
- Fill out the context for `ADR-000-repository-philosophy.md`.
- Review the event contracts and AI output formats when they are fully designed in `.ai/contracts/`.
- Review the directory structure to ensure it meets the team's ongoing workflow needs. All documentation is now strictly in English as requested.

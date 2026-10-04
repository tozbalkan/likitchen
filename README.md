# LI Kitchen & Bed — WhatsApp Lead Qualification

Qualifies kitchen and bath remodeling leads that arrive over WhatsApp, stores them in Supabase, and shows them to sales reps on a dashboard where they can take over the conversation.

```
WhatsApp (Meta Cloud API) → /api/webhooks/whatsapp → conversation pipeline (OpenAI fact extraction, scoring)
                                                    → Supabase (conversations, messages, leads)
Sales rep → /dashboard/leads → /api/dashboard/leads (Supabase Auth + tenant memberships)
```

Current status, roadmap and blockers: [`.ai/context/session-handoff.md`](.ai/context/session-handoff.md). Before changing architecture, read [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Vanilla Extract · Supabase (Postgres + Auth) · OpenAI · Vitest · pnpm

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create the database: run [`docs/db/schema.sql`](docs/db/schema.sql) in the Supabase SQL Editor. The file is idempotent and safe to re-run after schema changes.

3. Create a dashboard user in Supabase (**Authentication → Users**, with sign-ups disabled) and grant a membership:

   ```sql
   INSERT INTO tenant_memberships (user_id, tenant_id, role)
   VALUES ('<auth user id>', 'tenant-default', 'ADMIN');
   ```

4. Create `.env.local` (git-ignored):

   ```bash
   # Supabase
   SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server only, never NEXT_PUBLIC_

   # Tenant that owns the WhatsApp business number
   WHATSAPP_TENANT_ID=tenant-default

   # Meta WhatsApp Cloud API (see docs/setup/meta-ve-openai-kurulum-rehberi.md)
   WHATSAPP_PHONE_NUMBER_ID=
   WHATSAPP_ACCESS_TOKEN=
   WHATSAPP_APP_SECRET=
   WHATSAPP_VERIFY_TOKEN=          # any random string, e.g. openssl rand -hex 32

   # OpenAI
   OPENAI_API_KEY=
   ```

   The webhook fails closed (HTTP 500) if `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID` or `WHATSAPP_TENANT_ID` is missing.

5. Start the dev server on [http://localhost:3003](http://localhost:3003):

   ```bash
   pnpm dev
   ```

## Scripts

| Command                                  | Purpose                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js on port 3003                                                                  |
| `pnpm typecheck`                         | TypeScript                                                                            |
| `pnpm lint`                              | ESLint                                                                                |
| `pnpm test`                              | Unit tests (Vitest); Supabase integration tests are skipped                           |
| `pnpm test:integration`                  | Runs the webhook against the real Supabase from `.env.local` using a throwaway tenant |
| `pnpm lint:deps`                         | Clean Architecture layering (dependency-cruiser)                                      |
| `pnpm check:frozen`                      | Verifies frozen capabilities are unchanged                                            |
| `pnpm check:frontend`                    | Frontend rules: Vanilla Extract only, no inline styles                                |

A Husky pre-commit hook runs ESLint and Prettier on staged files.

## Documentation

- [`.ai/context/session-handoff.md`](.ai/context/session-handoff.md) — current state, roadmap, quality gates
- [`docs/architecture/capability-030-walkthrough.md`](docs/architecture/capability-030-walkthrough.md) — production slice and its remediation
- [`docs/db/schema.sql`](docs/db/schema.sql) — database schema and RLS policies
- [`docs/setup/meta-ve-openai-kurulum-rehberi.md`](docs/setup/meta-ve-openai-kurulum-rehberi.md) — client guide for Meta and OpenAI accounts (Turkish)
- [`.ai/handbook/`](.ai/handbook/) — ADRs, contracts and engineering rules

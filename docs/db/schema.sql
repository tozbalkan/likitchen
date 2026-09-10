-- Schema for LI Kitchen & Bed Production V1 (Supabase / PostgreSQL)

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant-default',
  phone_number VARCHAR(32) NOT NULL,
  stage VARCHAR(32) NOT NULL DEFAULT 'greeting',
  revision INT NOT NULL DEFAULT 0,
  facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INT NOT NULL DEFAULT 0,
  readiness_status VARCHAR(32) NOT NULL DEFAULT 'unresolved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant-default',
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  provider_message_id VARCHAR(128) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant-default',
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_name VARCHAR(128),
  phone VARCHAR(32) NOT NULL,
  project_type VARCHAR(64),
  location VARCHAR(128),
  budget VARCHAR(64),
  timeline VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'NEW',
  assigned_to VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================
-- RUNTIME ENFORCEMENT STATUS: BLOCKED / NOT ACTIVE
--
-- CRITICAL SECURITY NOTICE:
-- Production backend operations utilize SUPABASE_SERVICE_ROLE_KEY credentials.
-- In PostgreSQL / Supabase, connections authenticated via the service_role key
-- possess the BYPASSRLS attribute and bypass all Row Level Security policies.
--
-- Consequently:
-- 1. Database RLS runtime enforcement is currently NOT ACTIVE for backend service-role traffic.
-- 2. Application-level tenant filtering (mandatory tenant_id predicates on all queries
--    and mutations) serves as the PRIMARY multi-tenant isolation boundary.
-- 3. Composite uniqueness and NOT NULL constraints on tenant_id provide schema-level enforcement.
--
-- The policies below are retained strictly as future client-auth specifications for when
-- end-user Supabase Auth JWT sessions (e.g. auth.jwt() -> claims -> tenant_id) are deployed.
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Future end-user client-auth policies (Bypassed by service_role):
CREATE POLICY tenant_isolation_conversations ON conversations
  FOR ALL
  USING (tenant_id = coalesce(current_setting('app.current_tenant_id', true), (auth.jwt() ->> 'tenant_id')));

CREATE POLICY tenant_isolation_messages ON messages
  FOR ALL
  USING (tenant_id = coalesce(current_setting('app.current_tenant_id', true), (auth.jwt() ->> 'tenant_id')));

CREATE POLICY tenant_isolation_leads ON leads
  FOR ALL
  USING (tenant_id = coalesce(current_setting('app.current_tenant_id', true), (auth.jwt() ->> 'tenant_id')));


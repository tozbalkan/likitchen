-- Schema for LI Kitchen & Bed Production V1 (Supabase / PostgreSQL)

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
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
  tenant_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  provider_message_id VARCHAR(128) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_name VARCHAR(128),
  phone VARCHAR(32) NOT NULL,
  project_type VARCHAR(64),
  location VARCHAR(128),
  budget VARCHAR(64),
  timeline VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'NEW',
  assigned_to VARCHAR(64),
  human_takeover BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive migrations for databases created from an earlier revision of this file.
-- processed_at: set only after the pipeline succeeds, so Meta retries of a failed message are reprocessed.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'AUDITOR', 'VIEWER')),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_membership_user_tenant UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);

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
-- 4. tenant_memberships table enables user-session RLS (user_id = auth.uid()) for authenticated client queries.
--
-- Authenticated dashboard users are scoped by ACTIVE tenant_memberships (user_id = auth.uid()).
-- Tenant membership is the only trusted source; no custom JWT claims or session GUCs are used.
-- ==============================================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Superseded policies (relied on untrusted JWT claim / session GUC):
DROP POLICY IF EXISTS tenant_isolation_conversations ON conversations;
DROP POLICY IF EXISTS tenant_isolation_messages ON messages;
DROP POLICY IF EXISTS tenant_isolation_leads ON leads;

-- Users can read only their own memberships. No client-side INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS tenant_memberships_user_read ON tenant_memberships;
CREATE POLICY tenant_memberships_user_read ON tenant_memberships
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Read access to domain tables for any ACTIVE member of the row's tenant.
DROP POLICY IF EXISTS member_read_conversations ON conversations;
CREATE POLICY member_read_conversations ON conversations
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT tm.tenant_id FROM tenant_memberships tm
    WHERE tm.user_id = (SELECT auth.uid()) AND tm.status = 'ACTIVE'
  ));

DROP POLICY IF EXISTS member_read_messages ON messages;
CREATE POLICY member_read_messages ON messages
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT tm.tenant_id FROM tenant_memberships tm
    WHERE tm.user_id = (SELECT auth.uid()) AND tm.status = 'ACTIVE'
  ));

DROP POLICY IF EXISTS member_read_leads ON leads;
CREATE POLICY member_read_leads ON leads
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT tm.tenant_id FROM tenant_memberships tm
    WHERE tm.user_id = (SELECT auth.uid()) AND tm.status = 'ACTIVE'
  ));

-- Lead updates (human takeover, assignment) restricted to ADMIN / OPERATOR members.
DROP POLICY IF EXISTS operator_update_leads ON leads;
CREATE POLICY operator_update_leads ON leads
  FOR UPDATE TO authenticated
  USING (tenant_id IN (
    SELECT tm.tenant_id FROM tenant_memberships tm
    WHERE tm.user_id = (SELECT auth.uid()) AND tm.status = 'ACTIVE'
      AND tm.role IN ('ADMIN', 'OPERATOR')
  ))
  WITH CHECK (tenant_id IN (
    SELECT tm.tenant_id FROM tenant_memberships tm
    WHERE tm.user_id = (SELECT auth.uid()) AND tm.status = 'ACTIVE'
      AND tm.role IN ('ADMIN', 'OPERATOR')
  ));

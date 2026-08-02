-- Schema for LI Kitchen & Bed Production V1 (Supabase / PostgreSQL)

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
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
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  provider_message_id VARCHAR(128) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(64) PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

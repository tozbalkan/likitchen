import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('R4 / R7: Database Schema & Multi-Tenant Constraint Contracts', () => {
  const schemaPath = path.resolve(process.cwd(), 'docs/db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  it('1. Mandates tenant_id NOT NULL constraint on all persistent entities', () => {
    // conversations table
    expect(schemaSql).toMatch(
      /CREATE TABLE IF NOT EXISTS conversations\s*\([^;]*?tenant_id VARCHAR\(\d+\) NOT NULL/,
    );
    // messages table
    expect(schemaSql).toMatch(
      /CREATE TABLE IF NOT EXISTS messages\s*\([^;]*?tenant_id VARCHAR\(\d+\) NOT NULL/,
    );
    // leads table
    expect(schemaSql).toMatch(
      /CREATE TABLE IF NOT EXISTS leads\s*\([^;]*?tenant_id VARCHAR\(\d+\) NOT NULL/,
    );
  });

  it('2. Enforces atomic uniqueness on provider_message_id for idempotent message deduplication', () => {
    expect(schemaSql).toMatch(
      /provider_message_id VARCHAR\(\d+\) NOT NULL UNIQUE/,
    );
  });

  it('3. Defines explicit B-Tree indexes on tenant_id across all tables for performant isolation queries', () => {
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);',
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);',
    );
    expect(schemaSql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);',
    );
  });

  it('4. Documents truthful RLS runtime status: service_role bypasses RLS, primary boundary is application-level', () => {
    expect(schemaSql).toContain(
      'RUNTIME ENFORCEMENT STATUS: BLOCKED / NOT ACTIVE',
    );
    expect(schemaSql).toContain('BYPASSRLS');
    expect(schemaSql).toContain('Application-level tenant filtering');
  });
});

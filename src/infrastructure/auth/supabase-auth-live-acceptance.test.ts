import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-server';

describe('Live Supabase Auth Acceptance Harness', () => {
  const liveToken = process.env.SUPABASE_LIVE_USER_TOKEN;
  const config = getSupabaseConfig();

  it('verifies live Supabase Auth token if explicitly provided via SUPABASE_LIVE_USER_TOKEN', async () => {
    if (!liveToken || !config) {
      console.log(
        '[Live Auth Acceptance] BLOCKED BY ENVIRONMENT / PROJECT CONFIGURATION: SUPABASE_LIVE_USER_TOKEN or Supabase config not provided.',
      );
      expect(true).toBe(true);
      return;
    }

    const client = createClient(config.supabaseUrl, config.anonKey);
    const { data, error } = await client.auth.getUser(liveToken);

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    if (data.user) {
      expect(data.user.id).toBeDefined();
    }
  });
});

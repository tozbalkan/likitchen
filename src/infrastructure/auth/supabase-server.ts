import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export interface SupabaseConfig {
  readonly supabaseUrl: string;
  readonly anonKey: string;
}

/**
 * Retrieves and validates mandatory Supabase configuration.
 * Fails closed (returns null) if either URL or anon key is missing.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !url.trim() || !anonKey || !anonKey.trim()) {
    return null;
  }
  return {
    supabaseUrl: url.trim(),
    anonKey: anonKey.trim(),
  };
}

/**
 * Creates a server-side Supabase client scoped to the caller's session cookies or Bearer token.
 * Fails closed (returns null) if configuration is missing.
 */
export function createSupabaseServerClient(
  request: NextRequest,
  configOverride?: SupabaseConfig,
): SupabaseClient | null {
  const config = configOverride ?? getSupabaseConfig();
  if (!config) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

  const globalHeaders: Record<string, string> = {};
  if (bearerToken) {
    globalHeaders.Authorization = `Bearer ${bearerToken}`;
  }

  return createServerClient(config.supabaseUrl, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only session in route handler; session refresh handled by middleware if configured
      },
    },
    global: {
      headers: globalHeaders,
    },
  });
}

/**
 * Verifies caller identity using Supabase Auth getUser().
 * Never trusts unverified local claims.
 * Returns verified User and user-scoped Supabase client, or null if unauthenticated.
 */
export async function getAuthenticatedUser(
  request: NextRequest,
  clientOverride?: SupabaseClient,
): Promise<{ user: User; client: SupabaseClient } | null> {
  const client = clientOverride ?? createSupabaseServerClient(request);
  if (!client) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

  try {
    const { data, error } = bearerToken
      ? await client.auth.getUser(bearerToken)
      : await client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return { user: data.user, client };
  } catch {
    return null;
  }
}

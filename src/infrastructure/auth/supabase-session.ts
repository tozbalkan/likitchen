import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './supabase-server';

/**
 * Supabase client bound to the request's auth cookies, for Server Actions and Server Components.
 * Cookie writes only succeed in Server Actions / Route Handlers; in Server Components the
 * proxy refreshes the session instead. Returns null when Supabase is not configured.
 */
export async function createSupabaseCookieClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.supabaseUrl, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are read-only there.
        }
      },
    },
  });
}

export interface SessionRefreshResult {
  readonly response: NextResponse;
  readonly isAuthenticated: boolean;
}

/**
 * Refreshes the Supabase session for an incoming request (used by proxy.ts).
 * Verifies the user with the Auth server and forwards refreshed cookies and
 * no-store cache headers on the returned response.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
): Promise<SessionRefreshResult> {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return { response, isAuthenticated: false };

  const supabase = createServerClient(config.supabaseUrl, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, isAuthenticated: Boolean(data.user) };
}

import { NextResponse, type NextRequest } from 'next/server';
import { refreshSupabaseSession } from './infrastructure/auth/supabase-session';

/**
 * Keeps the Supabase session fresh and performs optimistic redirects.
 * This is not the authorization boundary: API handlers verify the user and
 * tenant membership on every request.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, isAuthenticated } = await refreshSupabaseSession(request);
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard/leads', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*', '/login'],
};

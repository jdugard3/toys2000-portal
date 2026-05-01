import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Let route handlers enforce API auth themselves so service-to-service calls
// (catalog sync, admin mutations, MarketTime proxies) return JSON instead of
// being redirected to /login by the page auth guard.
const PUBLIC_PATHS = ['/', '/login', '/api'];

export async function proxy(req) {
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            req.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired — required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!session && !isPublic) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const matcher = [
  '/((?!_next/static|_next/image|favicon.ico|logos|brands|catalogs|categories|icons.svg).*)',
];

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     */
    '/((?!_next/static|_next/image|favicon.ico|logos|brands|catalogs|categories|icons.svg).*)',
  ],
};

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Read AT Protocol session cookie and forward DID as header for server components
  const did = request.cookies.get('atproto_did')?.value;
  if (did) {
    response.headers.set('x-atproto-did', did);
  }

  // CSRF protection: Validate Origin on POST requests to auth endpoints
  if (request.method === 'POST' && request.nextUrl.pathname.startsWith('/api/auth/')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

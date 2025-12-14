import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/agent-dashboard'];

// Routes that should redirect to home if already authenticated
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for auth token in cookies (set by client-side auth store)
  // Note: Since we're using client-side storage (localStorage), we can't access it in middleware
  // This middleware will handle public route redirects, but actual auth checks happen client-side
  // For server-side auth checks, we'd need to use cookies instead of localStorage
  
  // Allow API routes and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For protected routes, we'll let the client-side handle redirects
  // since we're using localStorage for token storage
  // In a production app, you'd want to use httpOnly cookies for this
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};






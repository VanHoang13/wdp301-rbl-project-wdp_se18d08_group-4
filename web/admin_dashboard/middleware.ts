import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';

  // Protected routes
  const protectedRoutes = [
    '/dashboard',
    '/users',
    '/verifications',
    '/orders',
    '/disputes',
    '/reviews',
    '/analytics',
    '/notifications',
    '/activity-logs',
    '/settings',
  ];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route)) || pathname === '/';

  // If no token and trying to access protected route, redirect to login
  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If has token and trying to access login page, redirect to dashboard
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/tasks'
];

const authRoutes = [
  '/login',
  '/register',
  '/forgot-password'
];

export function proxy(request: NextRequest) {
  // Check for BOTH tokens (Access token in 'token' and Refresh token in 'refreshToken')
  const token = request.cookies.get('token')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value; 
  
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // The user has an active session if they have EITHER token
  // If access token is expired, the Axios interceptor will use the refresh token to get a new one.
  const hasActiveSession = !!token || !!refreshToken;

  // Logic 1: Unauthenticated user trying to access protected page
  if (isProtectedRoute && !hasActiveSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logic 2: Logged-in user trying to access login/register
  if (isAuthRoute && hasActiveSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

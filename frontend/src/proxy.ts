// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Arrays Define Karo (Ahiya tame easily nava routes umeri shako cho)
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
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 2. Array mathi dynamically check karo
  // .some() method check karse ke current pathname aa array mathi koi pan route thi start thay chhe ke nahi
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Logic 1: Vagar login e protected page par aave toh login par feko
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logic 2: Logged-in user jo pacho login/register par aave toh dashboard par feko
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Config unchanged
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all admin routes except login page
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const sessionCookie = request.cookies.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_for_meeting_room_booking_2026_system';
    const payload = await verifyJWT(sessionCookie.value, jwtSecret);

    if (!payload || payload.role !== 'admin') {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

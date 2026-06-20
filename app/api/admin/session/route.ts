import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'ไม่มีเซสชัน' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_for_meeting_room_booking_2026_system';
    const payload = await verifyJWT(sessionCookie.value, jwtSecret);

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'เซสชันไม่ถูกต้องหรือหมดอายุ' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: { role: 'admin' } }, { status: 200 });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดของระบบ' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';
import { rateLimit, getIP } from '@/lib/rate-limit';

// SHA-256 Hash of '5686340111349087'
const TARGET_PASSWORD_HASH = '8b4b31586c26a62e689ea8c410c83fd2b558d26feebdb4ef5d00928aeb8bdef4';

async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  try {
    // Security: Rate limiting (10 attempts per minute)
    const ip = getIP(request);
    const { success, remaining } = rateLimit(ip, 10, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'กรุณารอสักครู่ก่อนทำรายการใหม่' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || password.length !== 16) {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านต้องมีความยาว 16 หลัก' },
        { status: 400 }
      );
    }

    const inputHash = await sha256(password);

    if (inputHash !== TARGET_PASSWORD_HASH) {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Passwords match! Sign JWT
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_for_meeting_room_booking_2026_system';
    const token = await signJWT({ role: 'admin' }, jwtSecret, 86400); // 1 day expiry

    const response = NextResponse.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ' });

    // Set HTTP-Only Cookie for Session Auth (Security: CSRF, XSS protection, hidden from frontend JS)
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

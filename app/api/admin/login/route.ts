import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';
import { rateLimit, getIP } from '@/lib/rate-limit';

// Admin password hash from environment variable or default hash
const TARGET_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 'ac716ffdd1de888a42ab885a83211ec991cee0972c81168408fffd8db8abb0fd';

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
    const { success } = rateLimit(ip, 10, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'กรุณารอสักครู่ก่อนทำรายการใหม่' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกรหัสผ่าน' },
        { status: 400 }
      );
    }

    const inputHash = await sha256(password.trim());

    if (inputHash !== TARGET_PASSWORD_HASH) {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Passwords match! Sign JWT
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_for_meeting_room_booking_2026_system';
    const token = await signJWT({ role: 'admin' }, jwtSecret, 604800); // 7 days expiry

    const response = NextResponse.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ' });

    // Set HTTP-Only Cookie for Session Auth (Security: CSRF, XSS protection, hidden from frontend JS)
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800, // 7 days
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

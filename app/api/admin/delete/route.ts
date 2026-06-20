import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request (Security: Verify permission every time data is deleted)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_for_meeting_room_booking_2026_system';
    const payload = await verifyJWT(sessionCookie.value, jwtSecret);

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์ในการทำรายการนี้' }, { status: 403 });
    }

    // 2. Parse and Validate Input
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ success: false, message: 'ไม่พบรหัสรายการจอง' }, { status: 400 });
    }

    // 3. Check if booking exists and is cancelled
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ success: false, message: 'ไม่พบรายการจองที่ระบุ' }, { status: 404 });
    }

    // 4. Only allow deletion of cancelled bookings
    if (booking.status !== 'ยกเลิก') {
      return NextResponse.json({ success: false, message: 'เฉพาะรายการที่ยกเลิกเท่านั้นที่สามารถลบได้' }, { status: 400 });
    }

    // 5. Delete from Supabase (Using Admin Client to bypass RLS)
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `ลบการจอง "${booking.activity_name}" สำเร็จ`,
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}

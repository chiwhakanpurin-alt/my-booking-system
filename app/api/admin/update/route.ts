import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyJWT } from '@/lib/jwt';
import { syncToGoogleSheets } from '@/lib/google-sheets';
import { sendApprovalNotificationToUser, sendCancellationNotificationToUser } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request (Security: Verify permission every time data is modified)
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
    const { bookingId, status } = body;

    if (!bookingId) {
      return NextResponse.json({ success: false, message: 'ไม่พบรหัสรายการจอง' }, { status: 400 });
    }

    if (status !== 'อนุมัติแล้ว' && status !== 'ยกเลิก') {
      return NextResponse.json({ success: false, message: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    // 3. Get booking details BEFORE updating (for email notification)
    const { data: bookingData, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !bookingData) {
      return NextResponse.json({ success: false, message: 'ไม่พบรายการจองที่ระบุ' }, { status: 404 });
    }

    // 4. Update Supabase (Using Admin Client to bypass RLS safely since we verified JWT)
    const { data: updatedBooking, error } = await supabaseAdmin
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!updatedBooking) {
      return NextResponse.json({ success: false, message: 'ไม่พบรายการจองที่ระบุ' }, { status: 404 });
    }

    // 5. 📧 Send notification to user (background)
    if (status === 'อนุมัติแล้ว') {
      sendApprovalNotificationToUser({
        activityName: bookingData.activity_name,
        bookedBy: bookingData.booked_by,
        roomName: bookingData.room_name,
        bookingDate: bookingData.booking_date,
        startTime: bookingData.start_time,
        endTime: bookingData.end_time,
        userEmail: bookingData.email,
      }).catch((err) => console.error('Background Email to User (Approval) Error:', err));
    } else if (status === 'ยกเลิก') {
      sendCancellationNotificationToUser({
        activityName: bookingData.activity_name,
        bookedBy: bookingData.booked_by,
        roomName: bookingData.room_name,
        bookingDate: bookingData.booking_date,
        startTime: bookingData.start_time,
        endTime: bookingData.end_time,
        userEmail: bookingData.email,
      }).catch((err) => console.error('Background Email to User (Cancellation) Error:', err));
    }

    // 6. Sync status update to Google Sheets in background
    syncToGoogleSheets('update', {
      id: updatedBooking.id,
      activity_name: updatedBooking.activity_name,
      booked_by: updatedBooking.booked_by,
      room_name: updatedBooking.room_name,
      booking_date: updatedBooking.booking_date,
      start_time: updatedBooking.start_time,
      end_time: updatedBooking.end_time,
      status: updatedBooking.status,
      created_at: updatedBooking.created_at,
    }).catch((err) => console.error('Background Google Sheets Update Error:', err));

    return NextResponse.json({
      success: true,
      message: `ปรับปรุงสถานะเป็น "${status}" สำเร็จ`,
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการปรับปรุงข้อมูล' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncToGoogleSheets } from '@/lib/google-sheets';
import { sendBookingNotificationToAdmin } from '@/lib/email';
import { rateLimit, getIP } from '@/lib/rate-limit';

// GET: Fetch all bookings (ordered by booking_date and start_time)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json(
      { success: false, message: 'ไม่สามารถดึงข้อมูลการจองได้' },
      { status: 500 }
    );
  }
}

// POST: Create a new booking (initial status: "รออนุมัติ")
export async function POST(request: Request) {
  try {
    // Security: Rate limiting (5 attempts per minute)
    const ip = getIP(request);
    const { success } = rateLimit(ip, 5, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'ส่งคำขอจองบ่อยเกินไป กรุณารอสักครู่' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { activity_name, booked_by, email, room_name, booking_date, start_time, end_time, details } = body;

    // Server-side validations (Security: Prevent client-side manipulation, protect DB)
    if (!activity_name?.trim()) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อกิจกรรม' }, { status: 400 });
    }
    if (!booked_by?.trim()) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อผู้จอง' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุอีเมล' }, { status: 400 });
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'อีเมลไม่ถูกต้อง' }, { status: 400 });
    }
    if (!room_name) {
      return NextResponse.json({ success: false, message: 'กรุณาเลือกห้องประชุม' }, { status: 400 });
    }
    if (!booking_date) {
      return NextResponse.json({ success: false, message: 'กรุณาเลือกวันที่ต้องการจอง' }, { status: 400 });
    }
    if (!start_time || !end_time) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุเวลาเริ่มต้นและสิ้นสุด' }, { status: 400 });
    }

    // Time validation
    if (start_time >= end_time) {
      return NextResponse.json({ success: false, message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' }, { status: 400 });
    }

    // Sanitize input to prevent basic XSS
    const cleanActivity = activity_name.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const cleanBookedBy = booked_by.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const cleanDetails = details ? details.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim() : '';
    const cleanEmail = email.trim().toLowerCase();

    const newBooking = {
      activity_name: cleanActivity,
      booked_by: cleanBookedBy,
      email: cleanEmail,
      room_name,
      booking_date,
      start_time,
      end_time,
      status: 'รออนุมัติ', // Default status: "รออนุมัติ"
      details: cleanDetails,
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([newBooking])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 📧 Send notification to admin (background)
    sendBookingNotificationToAdmin({
      activityName: cleanActivity,
      bookedBy: cleanBookedBy,
      roomName: room_name,
      bookingDate: booking_date,
      startTime: start_time,
      endTime: end_time,
      details: cleanDetails,
    }).catch((err) => console.error('Background Email to Admin Error:', err));

    // Google Sheets Integration: Sync in background if URL is set (graceful fallback if not)
    // We do not await this to prevent slowing down the client's API response
    syncToGoogleSheets('insert', {
      id: data.id,
      activity_name: data.activity_name,
      booked_by: data.booked_by,
      room_name: data.room_name,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: data.end_time,
      status: data.status,
      created_at: data.created_at,
    }).catch((err) => console.error('Background Google Sheets Sync Error:', err));

    return NextResponse.json(
      { success: true, message: 'บันทึกคำขอสำเร็จ', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

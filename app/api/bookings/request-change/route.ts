import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit, getIP } from '@/lib/rate-limit';
import { syncToGoogleSheets } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    // Rate limiting (scoped to cancel action so it doesn't collide with login/booking on shared Wi-Fi)
    const ip = getIP(request);
    const { success } = rateLimit(`cancel:${ip}`, 5, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { bookingId, contactInfo } = body;

    if (!bookingId || !contactInfo) {
      return NextResponse.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // Fetch the original booking using supabaseAdmin to bypass RLS
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return NextResponse.json({ success: false, message: 'ไม่พบข้อมูลการจอง' }, { status: 404 });
    }

    const cleanContact = contactInfo.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();

    // Verify contact info strictly from the original booking
    let storedContact = '';
    if (booking.details) {
      const noPushSub = booking.details.split('---PUSH_SUB---')[0];
      const contactMatch = noPushSub.match(/---CONTACT_INFO---\s*([\s\S]*?)(?:---[A-Z_]+---|$)/);
      if (contactMatch) {
        storedContact = contactMatch[1].trim();
      }
    }

    // Security: Deny if no stored contact exists or if contact info does not match exactly
    if (!storedContact || storedContact !== cleanContact) {
      return NextResponse.json(
        { success: false, message: 'เบอร์ติดต่อไม่ตรงกับที่ใช้จอง กรุณาตรวจสอบอีกครั้ง' },
        { status: 403 }
      );
    }

    // Update status to Cancelled using supabaseAdmin to bypass RLS
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'ยกเลิก' })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Sync cancellation status to Google Sheets in background
    if (updatedBooking) {
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
      }).catch((err) => console.error('Background Google Sheets Cancel Sync Error:', err));
    }

    return NextResponse.json(
      { success: true, message: 'ยกเลิกการจองสำเร็จ' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit, getIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getIP(request);
    const { success } = rateLimit(ip, 5, 60 * 1000);
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

    // Verify contact info if it exists in the original booking
    let storedContact = '';
    if (booking.details) {
      const contactSplit = booking.details.split('---CONTACT_INFO---');
      if (contactSplit.length > 1) {
        storedContact = contactSplit[1].split('---PUSH_SUB---')[0].trim();
      }
    }

    if (storedContact && storedContact !== cleanContact) {
      return NextResponse.json(
        { success: false, message: 'เบอร์ติดต่อไม่ตรงกับที่ใช้จอง กรุณาตรวจสอบอีกครั้ง' },
        { status: 403 }
      );
    }

    // Update status to Cancelled using supabaseAdmin to bypass RLS
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'ยกเลิก' })
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
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


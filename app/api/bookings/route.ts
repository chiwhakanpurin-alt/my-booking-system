import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncToGoogleSheets } from '@/lib/google-sheets';
import { sendBookingNotificationToAdmin, sendBookingConfirmationToUser } from '@/lib/email';
import { rateLimit, getIP } from '@/lib/rate-limit';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-admin';

webpush.setVapidDetails(
  'mailto:chiwhakanpurin@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/jwt';

// GET: Fetch all bookings (ordered by booking_date and start_time)
export async function GET(request: Request) {
  try {
    // Security: Rate limiting for GET requests (e.g. 60 requests per minute)
    const ip = getIP(request);
    const { success } = rateLimit(ip, 60, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Too many requests' },
        { status: 429 }
      );
    }

    // Check if requester is admin
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');
    let isAdmin = false;

    if (sessionCookie) {
      try {
        const jwtSecret = process.env.JWT_SECRET || 'super_secret_for_meeting_room_booking_2026_system';
        const payload = await verifyJWT(sessionCookie.value, jwtSecret);
        if (payload && payload.role === 'admin') {
          isAdmin = true;
        }
      } catch (e) {
        // invalid token, ignore
      }
    }

    // Security: Do NOT select 'details' column to prevent PII exposure (emails, phones)
    let query = supabase
      .from('bookings')
      .select('id, activity_name, booked_by, room_name, booking_date, start_time, end_time, status, created_at')
      .neq('activity_name', 'ADMIN_SUBSCRIPTION')
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Hide cancelled bookings from public view, but let admins see them for record keeping
    if (!isAdmin) {
      query = query.neq('status', 'ยกเลิก');
    }

    const { data, error } = await query;

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
    const { activity_name, booked_by, contact_info, room_name, booking_date, start_time, end_time, details } = body;

    // Server-side validations (Security: Prevent client-side manipulation, protect DB)
    if (!activity_name?.trim()) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อกิจกรรม' }, { status: 400 });
    }
    if (!booked_by?.trim()) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อผู้จอง' }, { status: 400 });
    }
    if (!contact_info?.trim()) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุเบอร์ติดต่อ' }, { status: 400 });
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

    // Date validation: Prevent booking in the past
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (booking_date < todayStr) {
      return NextResponse.json({ success: false, message: 'ไม่สามารถจองห้องประชุมย้อนหลังได้' }, { status: 400 });
    }

    // Check for overlapping bookings
    const { data: overlappingBookings, error: overlapError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('room_name', room_name)
      .eq('booking_date', booking_date)
      .neq('status', 'ยกเลิก')
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (overlapError) {
      console.error('Overlap check error:', overlapError);
      return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบห้องว่าง' }, { status: 500 });
    }

    if (overlappingBookings && overlappingBookings.length > 0) {
      return NextResponse.json({ success: false, message: 'ห้องประชุมนี้มีการจองในช่วงเวลาดังกล่าวแล้ว' }, { status: 400 });
    }

    // Sanitize input to prevent basic XSS
    const cleanActivity = activity_name.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const cleanBookedBy = booked_by.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const cleanContact = contact_info.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const cleanDetails = details ? details.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim() : '';

    let pushSubString = '';
    if (body.pushSubscription) {
      pushSubString = `\n\n---PUSH_SUB---\n${JSON.stringify(body.pushSubscription)}`;
    }

    let contactInfoString = '';
    if (cleanContact) {
      contactInfoString = `\n\n---CONTACT_INFO---\n${cleanContact}`;
    }

    const combinedDetails = cleanDetails 
      ? `${cleanDetails}${contactInfoString}${pushSubString}`
      : `${contactInfoString}${pushSubString}`.trim();

    const newBooking = {
      activity_name: cleanActivity,
      booked_by: cleanBookedBy,
      room_name,
      booking_date,
      start_time,
      end_time,
      status: 'รออนุมัติ', // Default status: "รออนุมัติ"
      details: combinedDetails,
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([newBooking])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 📧 Send notification to admin via Email (wait for it to finish)
    try {
      await sendBookingNotificationToAdmin({
        activityName: cleanActivity,
        bookedBy: cleanBookedBy,
        roomName: room_name,
        bookingDate: booking_date,
        startTime: start_time,
        endTime: end_time,
        details: cleanDetails,
      });
    } catch (err) {
      console.error('Email to Admin Error:', err);
    }

    // 🚀 Send notification to admin via Web Push
    try {
      const { data: adminSubs } = await supabaseAdmin
        .from('bookings')
        .select('id, details')
        .eq('activity_name', 'ADMIN_SUBSCRIPTION');
      
      if (adminSubs && adminSubs.length > 0) {
        const title = '📢 มีคำขอจองห้องประชุมใหม่!';
        const bodyMsg = `ผู้จอง: ${cleanBookedBy}\nห้อง: ${room_name}\nเวลา: ${start_time}-${end_time}`;
        const payload = JSON.stringify({ title, body: bodyMsg });

        const pushPromises = adminSubs.map(async (sub) => {
          try {
            if (sub.details) {
              const pushSubscription = JSON.parse(sub.details);
              await webpush.sendNotification(pushSubscription, payload);
            }
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              // Subscription has expired or is no longer valid, delete it
              console.log('Deleting expired admin subscription:', sub.id);
              await supabaseAdmin.from('bookings').delete().eq('id', sub.id);
            } else {
              console.error('Admin Push Notification Error:', err);
            }
          }
        });

        await Promise.all(pushPromises);
      }
    } catch (err) {
      console.error('Admin Web Push Process Error:', err);
    }

    // 📧 Send confirmation to user (background)
    // Removed because the user only wants notification on approval

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

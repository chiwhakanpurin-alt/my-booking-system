import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-admin';

try {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:chiwhakanpurin@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
} catch (e) {
  console.warn('Failed to set VAPID details:', e);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pushSubscription, pendingBookingIds, sendTestPush = true } = body;

    if (!pushSubscription || !pushSubscription.endpoint) {
      return NextResponse.json(
        { success: false, message: 'Invalid push subscription' },
        { status: 400 }
      );
    }

    // 1. ผูก Push Subscription เข้ากับรายการจองที่รออนุมัติของเครื่องนี้ (กรณีผู้ใช้กดจองก่อนแล้วค่อยมากดอนุญาตแจ้งเตือนทีหลัง)
    if (Array.isArray(pendingBookingIds) && pendingBookingIds.length > 0) {
      const validIds = pendingBookingIds.filter((id) => typeof id === 'string' && id.trim()).slice(0, 20);
      if (validIds.length > 0) {
        const { data: rows } = await supabaseAdmin
          .from('bookings')
          .select('id, details')
          .in('id', validIds);

        if (rows && rows.length > 0) {
          for (const row of rows) {
            const baseDetails = row.details ? row.details.split('---PUSH_SUB---')[0].trim() : '';
            const updatedDetails = `${baseDetails}\n\n---PUSH_SUB---\n${JSON.stringify(pushSubscription)}`.trim();
            await supabaseAdmin
              .from('bookings')
              .update({ details: updatedDetails })
              .eq('id', row.id);
          }
        }
      }
    }

    // 2. ส่ง Web Push จริงผ่าน Apple APNs / FCM เพื่อยืนยันและทดสอบว่าการแจ้งเตือนทำงานได้ทันที
    if (sendTestPush) {
      const payload = JSON.stringify({
        title: '🔔 เปิดรับการแจ้งเตือนสำเร็จ!',
        body: 'ระบบพร้อมแจ้งเตือนสถานะการจองห้องประชุมถึงคุณทันที',
        icon: '/school-logo.png',
        badge: '/school-logo.png',
        tag: 'push-welcome-test',
        data: {
          url: '/',
        },
      });

      await webpush.sendNotification(pushSubscription, payload);
    }

    return NextResponse.json({
      success: true,
      message: 'ส่งการแจ้งเตือนทดสอบและบันทึกข้อมูลสำเร็จ',
    });
  } catch (error: unknown) {
    console.error('Test push error:', error);
    return NextResponse.json(
      { success: false, message: 'ไม่สามารถส่ง Web Push ได้' },
      { status: 500 }
    );
  }
}

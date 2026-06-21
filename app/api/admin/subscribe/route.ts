import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_for_meeting_room_booking_2026_system';
    const payload = await verifyJWT(sessionCookie.value, jwtSecret);

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // 2. Extract push subscription from body
    const body = await request.json();
    const { pushSubscription } = body;

    if (!pushSubscription || !pushSubscription.endpoint) {
      return NextResponse.json({ success: false, message: 'Invalid subscription data' }, { status: 400 });
    }

    // 3. Find if subscription already exists (we'll check endpoints in details)
    const { data: existingSubs, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, details')
      .eq('activity_name', 'ADMIN_SUBSCRIPTION');

    if (fetchError) throw fetchError;

    const subString = JSON.stringify(pushSubscription);
    const existing = existingSubs?.find(sub => sub.details === subString);

    if (existing) {
      return NextResponse.json({ success: true, message: 'Subscription already exists' }, { status: 200 });
    }

    // 4. Insert new subscription
    const newBooking = {
      activity_name: 'ADMIN_SUBSCRIPTION',
      booked_by: 'System',
      room_name: 'System',
      booking_date: new Date().toISOString().split('T')[0],
      start_time: '00:00',
      end_time: '00:00',
      status: 'system',
      details: subString,
    };

    const { error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert([newBooking]);

    if (insertError) throw insertError;

    return NextResponse.json(
      { success: true, message: 'Admin push subscription saved successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin Subscribe Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

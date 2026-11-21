import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Keep-Alive Endpoint (ป้องกัน Supabase Free Tier พักการทำงานเมื่อไม่มีผู้ใช้งานเกิน 7 วัน เช่น ช่วงปิดเทอม)
 * สามารถเรียกผ่าน Vercel Cron หรือระบบ Uptime Monitoring ได้
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Supabase database is active and healthy',
        timestamp: new Date().toISOString(),
        recordsChecked: data?.length ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Supabase keep-alive check failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Database keep-alive ping failed',
      },
      { status: 500 }
    );
  }
}

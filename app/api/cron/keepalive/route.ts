import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Make a lightweight query to the database to keep it active
    const { error } = await supabase.from('bookings').select('id').limit(1);
    
    if (error) {
      console.error('Supabase keepalive error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Supabase database is active and awake.' }, { status: 200 });
  } catch (err) {
    console.error('Supabase keepalive exception:', err);
    return NextResponse.json({ success: false, message: 'Keepalive failed' }, { status: 500 });
  }
}

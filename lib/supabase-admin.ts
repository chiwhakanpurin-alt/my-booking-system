import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Use the service role key for administrative tasks (bypasses RLS)
// This should NEVER be exposed to the browser.
// Fallback to anon key ONLY for local development without strict RLS, but warn in console.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to anon key. RLS may block admin operations.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
)

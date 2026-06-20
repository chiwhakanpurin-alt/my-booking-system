-- 1. Enable Row Level Security (RLS) on the bookings table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow anyone (anon) to SELECT bookings
-- (Required so the public calendar and dashboard can see existing bookings)
CREATE POLICY "Allow public read access" ON public.bookings
  FOR SELECT
  TO public
  USING (true);

-- 3. Policy: Allow anyone (anon) to INSERT new bookings
-- (Required so visitors can submit the booking form)
CREATE POLICY "Allow public insert access" ON public.bookings
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 4. Policy: Allow ONLY Service Role to UPDATE bookings
-- (Blocks anyone from updating bookings from the client side; updates must go through our Next.js API)
CREATE POLICY "Allow service role update access" ON public.bookings
  FOR UPDATE
  TO service_role
  USING (true);

-- 5. Policy: Allow ONLY Service Role to DELETE bookings
-- (Blocks anyone from deleting bookings from the client side)
CREATE POLICY "Allow service role delete access" ON public.bookings
  FOR DELETE
  TO service_role
  USING (true);

-- Note: The service_role bypasses RLS by default, but defining these explicitly
-- ensures that ONLY the service role can perform these actions, as anon is inherently excluded from UPDATE/DELETE now.

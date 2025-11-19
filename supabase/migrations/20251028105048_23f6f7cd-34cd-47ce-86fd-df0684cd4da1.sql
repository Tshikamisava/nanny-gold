-- Phase 2: Fix RLS policies for nanny access to client data

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Nannies can view client preferences for their bookings" ON client_preferences;
DROP POLICY IF EXISTS "Nannies can view client info for their bookings" ON clients;
DROP POLICY IF EXISTS "Nannies can view client profiles for their bookings" ON profiles;
DROP POLICY IF EXISTS "Nannies can view financials for their bookings" ON booking_financials;

-- Allow nannies to view client preferences for their bookings
CREATE POLICY "Nannies can view client preferences for their bookings"
ON client_preferences FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.client_id = client_preferences.client_id
    AND bookings.nanny_id = auth.uid()
  )
);

-- Allow nannies to view basic client info for their bookings
CREATE POLICY "Nannies can view client info for their bookings"
ON clients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.client_id = clients.id
    AND bookings.nanny_id = auth.uid()
  )
);

-- Allow nannies to view client profiles for their bookings
CREATE POLICY "Nannies can view client profiles for their bookings"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.client_id = profiles.id
    AND bookings.nanny_id = auth.uid()
  )
);

-- Allow nannies to view booking financials for their bookings
CREATE POLICY "Nannies can view financials for their bookings"
ON booking_financials FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_financials.booking_id
    AND bookings.nanny_id = auth.uid()
  )
);
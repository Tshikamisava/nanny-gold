-- Phase 1-3: Create RLS policies for nannies to access client data for their bookings

-- Phase 1: Allow nannies to view client profiles for their bookings
DROP POLICY IF EXISTS "Nannies can view client profiles for their bookings" ON profiles;

CREATE POLICY "Nannies can view client profiles for their bookings"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT nanny_id 
    FROM bookings 
    WHERE client_id = profiles.id
      AND nanny_id = auth.uid()
      AND status IN ('confirmed', 'active', 'completed', 'pending')
  )
);

-- Phase 2: Allow nannies to view client data for their bookings
DROP POLICY IF EXISTS "Nannies can view client data for their bookings" ON clients;

CREATE POLICY "Nannies can view client data for their bookings"
ON clients
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT nanny_id 
    FROM bookings 
    WHERE client_id = clients.id
      AND nanny_id = auth.uid()
      AND status IN ('confirmed', 'active', 'completed', 'pending')
  )
);

-- Phase 3: Allow nannies to view client preferences for their bookings
DROP POLICY IF EXISTS "Nannies can view client preferences for their bookings" ON client_preferences;

CREATE POLICY "Nannies can view client preferences for their bookings"
ON client_preferences
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT nanny_id 
    FROM bookings 
    WHERE client_id = client_preferences.client_id
      AND nanny_id = auth.uid()
      AND status IN ('confirmed', 'active', 'completed', 'pending')
  )
);
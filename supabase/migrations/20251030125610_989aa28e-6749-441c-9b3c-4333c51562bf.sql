-- Drop duplicate foreign key constraints that are causing PGRST201 errors
-- These duplicates prevent PostgREST from resolving relationships properly

ALTER TABLE IF EXISTS public.bookings 
  DROP CONSTRAINT IF EXISTS fk_bookings_client_id;

ALTER TABLE IF EXISTS public.bookings 
  DROP CONSTRAINT IF EXISTS fk_bookings_nanny_id;

-- The original Supabase-generated constraints remain intact:
-- bookings_client_id_fkey (bookings.client_id -> clients.id)
-- bookings_nanny_id_fkey (bookings.nanny_id -> nannies.id)
-- Fix nanny availability for booking matches
-- Enable bookings for approved nannies
UPDATE public.nannies 
SET can_receive_bookings = true,
    is_available = true
WHERE approval_status = 'approved' 
  AND can_receive_bookings = false;
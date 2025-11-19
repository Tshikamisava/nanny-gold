-- Enable can_receive_bookings for approved nannies to increase the pool
UPDATE public.nannies 
SET can_receive_bookings = true 
WHERE approval_status = 'approved' 
  AND is_available = true 
  AND can_receive_bookings = false;
-- Phase 1: Add foreign key constraint for client_id
ALTER TABLE public.bookings
ADD CONSTRAINT fk_bookings_client_id
FOREIGN KEY (client_id)
REFERENCES public.clients(id)
ON DELETE CASCADE;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_id 
ON public.bookings(client_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT fk_bookings_client_id ON public.bookings IS 
'Links bookings to the client who made the booking. Cascades on delete to prevent orphaned bookings.';

-- Phase 2: Add foreign key constraint for nanny_id
ALTER TABLE public.bookings
ADD CONSTRAINT fk_bookings_nanny_id
FOREIGN KEY (nanny_id)
REFERENCES public.nannies(id)
ON DELETE CASCADE;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_bookings_nanny_id 
ON public.bookings(nanny_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT fk_bookings_nanny_id ON public.bookings IS 
'Links bookings to the assigned nanny. Cascades on delete to prevent orphaned bookings.';
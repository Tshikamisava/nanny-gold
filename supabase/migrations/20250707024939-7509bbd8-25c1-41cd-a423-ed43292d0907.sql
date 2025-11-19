-- Add missing profile fields to clients table
ALTER TABLE public.clients 
ADD COLUMN other_dependents INTEGER DEFAULT 0,
ADD COLUMN pets_in_home TEXT,
ADD COLUMN home_size TEXT;

-- Add durationType and bookingSubType to client_preferences for booking flow memory
ALTER TABLE public.client_preferences
ADD COLUMN duration_type TEXT,
ADD COLUMN booking_sub_type TEXT,
ADD COLUMN selected_dates TEXT[],
ADD COLUMN time_slots JSONB;
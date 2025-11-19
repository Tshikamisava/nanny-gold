-- Add booking_type field to bookings table to track different types of bookings
ALTER TABLE public.bookings 
ADD COLUMN booking_type text;

-- Add check constraint to ensure valid booking types
ALTER TABLE public.bookings 
ADD CONSTRAINT valid_booking_type 
CHECK (booking_type IN ('emergency', 'date_night', 'date_day', 'school_holiday', 'long_term', 'standard'));

-- Update existing bookings to set booking_type based on services data
UPDATE public.bookings 
SET booking_type = CASE 
  WHEN services->>'bookingSubType' = 'emergency' THEN 'emergency'
  WHEN services->>'bookingSubType' = 'date_night' THEN 'date_night'
  WHEN services->>'bookingSubType' = 'school_holiday' THEN 'school_holiday'
  WHEN services->>'durationType' = 'short_term' THEN 'date_day'
  WHEN services->>'durationType' = 'long_term' THEN 'long_term'
  ELSE 'standard'
END;
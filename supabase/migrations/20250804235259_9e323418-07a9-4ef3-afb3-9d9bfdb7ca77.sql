-- Add driving_license field to nanny_services table
ALTER TABLE public.nanny_services 
ADD COLUMN driving_license boolean DEFAULT false;

-- Update the comment to reflect the new field
COMMENT ON COLUMN public.nanny_services.driving_license IS 'Whether the nanny has a valid driving license for transportation services';
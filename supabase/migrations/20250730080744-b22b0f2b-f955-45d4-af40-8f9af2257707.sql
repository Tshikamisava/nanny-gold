-- Create function to bypass RLS for development mode nanny profile creation
CREATE OR REPLACE FUNCTION public.create_dev_nanny_profile(
  p_user_id UUID,
  p_first_name TEXT,
  p_bio TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.nannies (
    id,
    bio,
    experience_level,
    hourly_rate,
    monthly_rate,
    languages,
    skills,
    certifications,
    is_available,
    approval_status
  ) VALUES (
    p_user_id,
    COALESCE(p_bio, 'Hi, I''m ' || p_first_name || '! I''m a dedicated nanny looking to provide exceptional care for your family.'),
    '1-3'::experience_level,
    150,
    6000,
    ARRAY['English'],
    ARRAY['Childcare', 'First Aid'],
    ARRAY[]::text[],
    true,
    'pending'
  );
END;
$$;
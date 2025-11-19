-- Create bypass functions for all user types to avoid RLS issues in development

-- Function to create client profile in development mode
CREATE OR REPLACE FUNCTION public.create_dev_client_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.clients (id) VALUES (p_user_id);
END;
$function$;

-- Function to create nanny profile in development mode
CREATE OR REPLACE FUNCTION public.create_dev_nanny_profile(p_user_id uuid, p_first_name text, p_bio text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function to create admin role in development mode
CREATE OR REPLACE FUNCTION public.create_dev_admin_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'admin');
END;
$function$;
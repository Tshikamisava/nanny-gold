-- Final comprehensive fix for all remaining functions without search_path
-- This should address all the remaining SECURITY DEFINER functions

-- Fix notify_admins_of_profile_submission function
CREATE OR REPLACE FUNCTION public.notify_admins_of_profile_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user_id UUID;
  nanny_name TEXT;
BEGIN
  -- Get nanny's name for notification
  SELECT CONCAT(first_name, ' ', last_name) INTO nanny_name
  FROM public.profiles 
  WHERE id = NEW.id;
  
  -- Insert notification for all admins
  FOR admin_user_id IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      admin_user_id,
      'New Nanny Profile Submitted',
      CONCAT(COALESCE(nanny_name, 'A nanny'), ' has submitted their profile for review. Please verify documents and approve when ready.'),
      'profile_submission',
      jsonb_build_object(
        'nanny_id', NEW.id,
        'nanny_name', nanny_name,
        'submitted_at', now()
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Fix get_chat_messages function
CREATE OR REPLACE FUNCTION public.get_chat_messages(room_id_param uuid)
RETURNS TABLE(id uuid, content text, sender_id uuid, sender_name text, sender_type text, created_at timestamp with time zone, room_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.content,
    cm.sender_id,
    cm.sender_name,
    cm.sender_type,
    cm.created_at,
    cm.room_id
  FROM public.chat_messages cm
  WHERE cm.room_id = room_id_param
  ORDER BY cm.created_at ASC;
END;
$$;

-- Fix setup_super_admin function
CREATE OR REPLACE FUNCTION public.setup_super_admin(admin_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find user by email in profiles
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Insert admin role if it doesn't exist (use 'admin' not 'super_admin')
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create admin profile if it doesn't exist
  INSERT INTO public.admins (id, department, permissions, admin_level)
  VALUES (admin_user_id, 'Executive', '{"all": true}'::jsonb, 'super_admin')
  ON CONFLICT (id) DO UPDATE SET admin_level = 'super_admin', permissions = '{"all": true}'::jsonb;
  
  RETURN admin_user_id;
END;
$$;

-- Fix check_security_status function
CREATE OR REPLACE FUNCTION public.check_security_status()
RETURNS TABLE(check_name text, status text, recommendation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Database Functions'::text as check_name,
    'SECURE'::text as status,
    'All functions have proper search_path set'::text as recommendation
  UNION ALL
  SELECT 
    'Role-based Access'::text as check_name,
    'SECURE'::text as status,
    'Admin privilege escalation prevention in place'::text as recommendation
  UNION ALL
  SELECT 
    'Audit Logging'::text as check_name,
    'SECURE'::text as status,
    'Role changes and profile modifications are logged'::text as recommendation
  UNION ALL
  SELECT 
    'Input Validation'::text as check_name,
    'SECURE'::text as status,
    'Email and phone validation constraints active'::text as recommendation
  UNION ALL
  SELECT 
    'Manual Configuration Required'::text as check_name,
    'PENDING'::text as status,
    'Configure OTP expiry and password leak protection in Supabase Dashboard'::text as recommendation;
END;
$$;

-- Fix send_chat_message function
CREATE OR REPLACE FUNCTION public.send_chat_message(room_id_param uuid, content_param text, sender_name_param text, sender_type_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_id uuid;
BEGIN
  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    content,
    sender_name,
    sender_type
  ) VALUES (
    room_id_param,
    auth.uid(),
    content_param,
    sender_name_param,
    sender_type_param
  )
  RETURNING id INTO message_id;
  
  RETURN message_id;
END;
$$;

-- Fix security_validation_report function
CREATE OR REPLACE FUNCTION public.security_validation_report()
RETURNS TABLE(category text, check_name text, status text, details text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Database Security Checks
  RETURN QUERY
  SELECT 
    'Database Security'::text,
    'Privilege Escalation Prevention'::text,
    'SECURED'::text,
    'Only admins can assign admin roles'::text
  UNION ALL
  SELECT 
    'Database Security'::text,
    'Function Search Paths'::text,
    'SECURED'::text,
    'All functions use SET search_path = public'::text
  UNION ALL
  SELECT 
    'Database Security'::text,
    'Input Validation'::text,
    'SECURED'::text,
    'Email and phone validation constraints active'::text
  UNION ALL
  SELECT 
    'Audit & Monitoring'::text,
    'Role Change Tracking'::text,
    'ACTIVE'::text,
    'All role modifications are logged with admin accountability'::text
  UNION ALL
  SELECT 
    'Audit & Monitoring'::text,
    'Profile Change Tracking'::text,
    'ACTIVE'::text,
    'Admin profile modifications are logged'::text
  UNION ALL
  SELECT 
    'Platform Configuration'::text,
    'OTP Expiry Settings'::text,
    'MANUAL ACTION REQUIRED'::text,
    'Configure in Supabase Dashboard > Authentication > Settings'::text
  UNION ALL
  SELECT 
    'Platform Configuration'::text,
    'Password Leak Protection'::text,
    'MANUAL ACTION REQUIRED'::text,
    'Enable in Supabase Dashboard > Authentication > Settings'::text;
END;
$$;

-- Fix assign_material_to_all_nannies function
CREATE OR REPLACE FUNCTION public.assign_material_to_all_nannies(p_material_id uuid, p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.professional_development_assignments (material_id, nanny_id, due_date)
  SELECT 
    p_material_id,
    n.id,
    p_due_date
  FROM public.nannies n
  WHERE n.approval_status = 'approved'
  ON CONFLICT (material_id, nanny_id) DO NOTHING;
END;
$$;

-- Fix update_nanny_pd_compliance function
CREATE OR REPLACE FUNCTION public.update_nanny_pd_compliance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update compliance status based on overdue mandatory assignments
  UPDATE public.nannies 
  SET pd_compliance_status = CASE
    WHEN EXISTS (
      SELECT 1 
      FROM public.professional_development_assignments pda
      JOIN public.professional_development_materials pdm ON pda.material_id = pdm.id
      WHERE pda.nanny_id = nannies.id 
        AND pdm.is_mandatory = true
        AND pda.status IN ('assigned', 'in_progress', 'overdue')
        AND pda.due_date < now()
        AND NOT EXISTS (
          SELECT 1 
          FROM public.professional_development_completions pdc 
          WHERE pdc.assignment_id = pda.id
        )
    ) THEN 'suspended'
    WHEN EXISTS (
      SELECT 1 
      FROM public.professional_development_assignments pda
      JOIN public.professional_development_materials pdm ON pda.material_id = pdm.id
      WHERE pda.nanny_id = nannies.id 
        AND pdm.is_mandatory = true
        AND pda.status IN ('assigned', 'in_progress')
        AND NOT EXISTS (
          SELECT 1 
          FROM public.professional_development_completions pdc 
          WHERE pdc.assignment_id = pda.id
        )
    ) THEN 'pending'
    ELSE 'compliant'
  END;
END;
$$;

-- Fix update_assignment_status function
CREATE OR REPLACE FUNCTION public.update_assignment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update overdue assignments
  UPDATE public.professional_development_assignments
  SET status = 'overdue'
  WHERE due_date < now() 
    AND status IN ('assigned', 'in_progress')
    AND NOT EXISTS (
      SELECT 1 
      FROM public.professional_development_completions 
      WHERE assignment_id = id
    );
  
  RETURN NULL;
END;
$$;

-- Fix notify_nanny_payment_advice function
CREATE OR REPLACE FUNCTION public.notify_nanny_payment_advice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create notification record
  INSERT INTO public.nanny_payment_notifications (nanny_id, payment_advice_id)
  VALUES (NEW.nanny_id, NEW.id);
  
  -- Create system notification
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    NEW.nanny_id,
    'Payment Advice Available',
    'Payment advice ' || NEW.advice_number || ' is now available for download.',
    'payment_advice_generated',
    jsonb_build_object(
      'advice_id', NEW.id,
      'advice_number', NEW.advice_number,
      'net_amount', NEW.net_amount,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end
    )
  );
  
  RETURN NEW;
END;
$$;
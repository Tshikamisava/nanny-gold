-- Priority 1: Critical Database Security Fixes (Fixed version)

-- 1. Fix privilege escalation vulnerability - restrict admin role assignment
-- Update existing policies for user_roles
DROP POLICY IF EXISTS "Only admins can assign admin roles" ON public.user_roles;

CREATE POLICY "Only admins can assign admin roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  CASE 
    WHEN role = 'admin' THEN public.is_admin()
    ELSE true
  END
);

DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
CREATE POLICY "Only admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (public.is_admin());

-- 2. Fix all database functions to include proper search_path (Security Issue)
-- Update existing functions to be more secure

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'admin');
$function$;

-- Fix phone_exists function
CREATE OR REPLACE FUNCTION public.phone_exists(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE phone = phone_number
  );
END;
$function$;

-- Fix update_verification_step function
CREATE OR REPLACE FUNCTION public.update_verification_step(p_nanny_id uuid, p_step_name text, p_status text, p_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.nanny_verification_steps (nanny_id, step_name, status, notes, completed_at)
  VALUES (
    p_nanny_id, 
    p_step_name, 
    p_status,
    p_notes,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  ON CONFLICT (nanny_id, step_name) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();
END;
$function$;

-- Fix log_profile_change function
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only log if admin is making changes
  IF public.is_admin() AND OLD IS DISTINCT FROM NEW THEN
    
    -- Log bio changes
    IF OLD.bio IS DISTINCT FROM NEW.bio THEN
      INSERT INTO public.profile_audit_log (nanny_id, admin_id, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'bio', OLD.bio, NEW.bio);
    END IF;
    
    -- Log rate changes
    IF OLD.hourly_rate IS DISTINCT FROM NEW.hourly_rate THEN
      INSERT INTO public.profile_audit_log (nanny_id, admin_id, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'hourly_rate', OLD.hourly_rate::text, NEW.hourly_rate::text);
    END IF;
    
    IF OLD.monthly_rate IS DISTINCT FROM NEW.monthly_rate THEN
      INSERT INTO public.profile_audit_log (nanny_id, admin_id, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'monthly_rate', OLD.monthly_rate::text, NEW.monthly_rate::text);
    END IF;
    
    -- Log approval status changes
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      INSERT INTO public.profile_audit_log (nanny_id, admin_id, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'approval_status', OLD.approval_status, NEW.approval_status);
    END IF;
    
    -- Log verification changes
    IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      INSERT INTO public.profile_audit_log (nanny_id, admin_id, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'is_verified', OLD.is_verified::text, NEW.is_verified::text);
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix remaining functions with search_path
CREATE OR REPLACE FUNCTION public.update_payment_schedule_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  dates RECORD;
BEGIN
  -- Calculate next payment dates
  SELECT * INTO dates FROM public.calculate_next_payment_dates(now(), NEW.authorization_day, NEW.capture_day);
  
  NEW.next_authorization_date := dates.next_auth_date;
  NEW.next_capture_date := dates.next_capture_date;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_next_payment_dates(input_date timestamp with time zone DEFAULT now(), auth_day integer DEFAULT 25, capture_day integer DEFAULT 1)
RETURNS TABLE(next_auth_date timestamp with time zone, next_capture_date timestamp with time zone)
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  current_month_auth TIMESTAMPTZ;
  current_month_capture TIMESTAMPTZ;
  next_month_auth TIMESTAMPTZ;
  next_month_capture TIMESTAMPTZ;
BEGIN
  -- Calculate authorization date for current month (25th)
  current_month_auth := date_trunc('month', input_date) + INTERVAL '1 day' * (auth_day - 1);
  
  -- Calculate capture date for next month (1st)
  current_month_capture := date_trunc('month', input_date) + INTERVAL '1 month' + INTERVAL '1 day' * (capture_day - 1);
  
  -- If we've passed the current month's auth date, move to next month
  IF input_date > current_month_auth THEN
    next_auth_date := date_trunc('month', input_date) + INTERVAL '1 month' + INTERVAL '1 day' * (auth_day - 1);
    next_capture_date := date_trunc('month', input_date) + INTERVAL '2 months' + INTERVAL '1 day' * (capture_day - 1);
  ELSE
    next_auth_date := current_month_auth;
    next_capture_date := current_month_capture;
  END IF;
  
  RETURN QUERY SELECT next_auth_date, next_capture_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
DECLARE
  R CONSTANT DECIMAL := 6371; -- Earth's radius in kilometers
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  -- Haversine formula
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_accept_backup_nanny()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Auto-accept backup nanny requests where deadline has passed
  UPDATE public.backup_nanny_requests
  SET 
    status = 'accepted',
    responded_at = now()
  WHERE status = 'pending'
    AND client_response_deadline < now();
    
  -- Create new bookings for auto-accepted backup requests
  INSERT INTO public.bookings (
    client_id,
    nanny_id,
    status,
    start_date,
    end_date,
    schedule,
    living_arrangement,
    services,
    base_rate,
    additional_services_cost,
    total_monthly_cost
  )
  SELECT 
    bnr.client_id,
    bnr.backup_nanny_id,
    'confirmed',
    b.start_date,
    b.end_date,
    b.schedule,
    b.living_arrangement,
    b.services,
    n.monthly_rate,
    b.additional_services_cost,
    n.monthly_rate + b.additional_services_cost
  FROM public.backup_nanny_requests bnr
  JOIN public.bookings b ON b.id = bnr.original_booking_id
  JOIN public.nannies n ON n.id = bnr.backup_nanny_id
  WHERE bnr.status = 'accepted'
    AND bnr.responded_at = now()
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE client_id = bnr.client_id 
        AND nanny_id = bnr.backup_nanny_id 
        AND status = 'confirmed'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_booking_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  client_has_backup BOOLEAN;
  backup_nanny_id UUID;
BEGIN
  -- Only trigger when status changes to 'rejected'
  IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    -- Check if client has backup nanny preference enabled
    SELECT backup_nanny INTO client_has_backup
    FROM public.client_preferences
    WHERE client_id = NEW.client_id;
    
    IF client_has_backup THEN
      -- Find an available backup nanny with similar preferences
      SELECT n.id INTO backup_nanny_id
      FROM public.nannies n
      JOIN public.nanny_services ns ON n.id = ns.nanny_id
      JOIN public.client_preferences cp ON cp.client_id = NEW.client_id
      WHERE n.is_available = true
        AND n.id != NEW.nanny_id
        AND (cp.experience_level IS NULL OR n.experience_level = cp.experience_level)
      ORDER BY n.rating DESC
      LIMIT 1;
      
      -- Create backup nanny request if backup nanny found
      IF backup_nanny_id IS NOT NULL THEN
        INSERT INTO public.backup_nanny_requests (
          original_booking_id,
          client_id,
          backup_nanny_id,
          reason,
          client_response_deadline
        ) VALUES (
          NEW.id,
          NEW.client_id,
          backup_nanny_id,
          'Original nanny rejected booking',
          now() + INTERVAL '24 hours'
        );
        
        -- Create notification for client
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          data
        ) VALUES (
          NEW.client_id,
          'Backup Nanny Available',
          'Your original booking was rejected, but we found a backup nanny for you. Please review and accept within 24 hours.',
          'backup_nanny_request',
          jsonb_build_object('backup_request_id', (SELECT id FROM public.backup_nanny_requests WHERE original_booking_id = NEW.id ORDER BY requested_at DESC LIMIT 1))
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Add role change audit logging
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  old_role text,
  new_role text NOT NULL,
  change_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on role audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view role audit logs
DROP POLICY IF EXISTS "Admins can view role audit logs" ON public.role_audit_log;
CREATE POLICY "Admins can view role audit logs" 
ON public.role_audit_log 
FOR SELECT 
USING (public.is_admin());

-- Create trigger function for role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log role assignments
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, admin_id, old_role, new_role, change_reason)
    VALUES (NEW.user_id, auth.uid(), NULL, NEW.role, 'Role assigned');
    RETURN NEW;
  END IF;
  
  -- Log role updates
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.role_audit_log (user_id, admin_id, old_role, new_role, change_reason)
    VALUES (NEW.user_id, auth.uid(), OLD.role, NEW.role, 'Role updated');
    RETURN NEW;
  END IF;
  
  -- Log role deletions
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (user_id, admin_id, old_role, new_role, change_reason)
    VALUES (OLD.user_id, auth.uid(), OLD.role, NULL, 'Role removed');
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for role audit logging
DROP TRIGGER IF EXISTS role_audit_trigger ON public.user_roles;
CREATE TRIGGER role_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();

-- 4. Add input validation functions for critical data
CREATE OR REPLACE FUNCTION public.validate_email(email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_phone_number(phone text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
BEGIN
  -- South African phone number validation
  RETURN phone ~ '^(\+27|0)[0-9]{9}$';
END;
$function$;

-- Add check constraints for critical data validation
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_email;
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_email CHECK (email IS NULL OR public.validate_email(email));

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_phone;
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_phone CHECK (phone IS NULL OR public.validate_phone_number(phone));

-- 5. Create system admin seeding function (for development)
CREATE OR REPLACE FUNCTION public.seed_system_admin(admin_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email in profiles
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Insert admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN admin_user_id;
END;
$function$;
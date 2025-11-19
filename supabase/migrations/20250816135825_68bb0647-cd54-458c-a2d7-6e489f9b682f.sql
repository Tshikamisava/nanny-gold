-- Fix the log_role_changes function to handle system operations
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log role assignments
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, admin_id, old_role, new_role, change_reason)
    VALUES (
      NEW.user_id, 
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), -- Use system UUID for system operations
      NULL, 
      NEW.role, 
      CASE WHEN auth.uid() IS NULL THEN 'System operation' ELSE 'Role assigned' END
    );
    RETURN NEW;
  END IF;
  
  -- Log role updates
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.role_audit_log (user_id, admin_id, old_role, new_role, change_reason)
    VALUES (
      NEW.user_id, 
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), -- Use system UUID for system operations
      OLD.role, 
      NEW.role, 
      CASE WHEN auth.uid() IS NULL THEN 'System operation' ELSE 'Role updated' END
    );
    RETURN NEW;
  END IF;
  
  -- Log role deletions
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (user_id, admin_id, old_role, new_role, change_reason)
    VALUES (
      OLD.user_id, 
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), -- Use system UUID for system operations
      OLD.role, 
      NULL, 
      CASE WHEN auth.uid() IS NULL THEN 'System operation' ELSE 'Role removed' END
    );
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
-- Fix security issues from the migration

-- 1. Fix the function search path issue by explicitly setting it
CREATE OR REPLACE FUNCTION notify_admins_of_profile_submission()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
-- Create function to notify admins when nanny submits profile
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profile submission notifications
-- We'll add a profile_submitted_at field to track submissions
ALTER TABLE public.nannies 
ADD COLUMN IF NOT EXISTS profile_submitted_at TIMESTAMP WITH TIME ZONE;

-- Create trigger that fires when profile_submitted_at is set
CREATE OR REPLACE TRIGGER trigger_profile_submission_notification
  AFTER UPDATE OF profile_submitted_at ON public.nannies
  FOR EACH ROW
  WHEN (OLD.profile_submitted_at IS NULL AND NEW.profile_submitted_at IS NOT NULL)
  EXECUTE FUNCTION notify_admins_of_profile_submission();
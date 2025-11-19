-- Update nannies table to support comprehensive verification flow
ALTER TABLE public.nannies 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'document_pending',
ADD COLUMN IF NOT EXISTS interview_status text DEFAULT 'not_scheduled',
ADD COLUMN IF NOT EXISTS interview_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS can_receive_bookings boolean DEFAULT false;

-- Create comprehensive notification system for verification steps
CREATE OR REPLACE FUNCTION public.notify_nanny_verification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  nanny_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Get nanny's name
  SELECT CONCAT(first_name, ' ', last_name) INTO nanny_name
  FROM public.profiles 
  WHERE id = NEW.nanny_id;
  
  -- Determine notification based on verification step status
  IF NEW.step_name = 'document_verification' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    notification_title := 'Documents Verified - Interview Required';
    notification_message := 'Congratulations! Your documents have been verified. Please schedule an interview to complete your onboarding process.';
    notification_type := 'verification_step_completed';
    
    -- Update nanny verification status
    UPDATE public.nannies
    SET verification_status = 'interview_required'
    WHERE id = NEW.nanny_id;
    
  ELSIF NEW.step_name = 'interview_completed' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    notification_title := 'Interview Passed - Welcome to NannyGold!';
    notification_message := 'Congratulations! You have successfully completed all verification steps and can now receive booking requests.';
    notification_type := 'onboarding_complete';
    
    -- Update nanny to fully verified and can receive bookings
    UPDATE public.nannies
    SET 
      verification_status = 'verified',
      interview_status = 'passed',
      interview_completed_at = now(),
      verification_completed_at = now(),
      can_receive_bookings = true,
      approval_status = 'approved',
      is_verified = true
    WHERE id = NEW.nanny_id;
    
  END IF;
  
  -- Send notification to nanny if we have a message
  IF notification_title IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      NEW.nanny_id,
      notification_title,
      notification_message,
      notification_type,
      jsonb_build_object(
        'step_name', NEW.step_name,
        'verification_status', NEW.status,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for verification step updates
DROP TRIGGER IF EXISTS on_verification_step_updated ON public.nanny_verification_steps;
CREATE TRIGGER on_verification_step_updated
  AFTER UPDATE ON public.nanny_verification_steps
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_nanny_verification_update();

-- Create function to schedule interview after document verification
CREATE OR REPLACE FUNCTION public.schedule_interview_after_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If documents are verified, create a notification for admin to schedule interview
  IF NEW.verification_status = 'interview_required' AND OLD.verification_status != 'interview_required' THEN
    -- Notify all admins about interview scheduling requirement
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data
    )
    SELECT 
      ur.user_id,
      'Interview Required',
      'Nanny ' || COALESCE((SELECT CONCAT(first_name, ' ', last_name) FROM public.profiles WHERE id = NEW.id), 'Unknown') || ' has completed document verification and requires an interview to be scheduled.',
      'admin_action_required',
      jsonb_build_object(
        'nanny_id', NEW.id,
        'action_type', 'schedule_interview',
        'verification_status', NEW.verification_status
      )
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for nanny verification status updates
DROP TRIGGER IF EXISTS on_nanny_verification_status_updated ON public.nannies;
CREATE TRIGGER on_nanny_verification_status_updated
  AFTER UPDATE ON public.nannies
  FOR EACH ROW 
  EXECUTE FUNCTION public.schedule_interview_after_verification();
-- Create a trigger function to notify admins of new uploads
CREATE OR REPLACE FUNCTION public.notify_admin_on_upload()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Insert a notification for the admin
  INSERT INTO public.admin_notifications (user_id, user_type, email, created_at)
  VALUES (NEW.user_id, 'nanny', NEW.file_name, NOW());

  RETURN NEW;
END;
$function$;

-- Attach the trigger to the uploads table
CREATE TRIGGER notify_admin_after_upload
AFTER INSERT ON public.uploads
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_upload();
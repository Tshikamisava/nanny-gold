-- Fix the notify_new_support_ticket trigger function to properly construct JSON headers
CREATE OR REPLACE FUNCTION public.notify_new_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_name TEXT;
  user_email TEXT;
  service_role_secret TEXT;
BEGIN
  -- Get user details
  SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')), email
  INTO user_name, user_email
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Get service role key
  SELECT decrypted_secret INTO service_role_secret
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;
  
  -- Call the edge function with properly constructed headers
  PERFORM
    net.http_post(
      url := 'https://msawldkygbsipjmjuyue.supabase.co/functions/v1/notify-support-ticket',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_secret
      ),
      body := jsonb_build_object(
        'ticketId', NEW.id,
        'subject', NEW.subject,
        'description', NEW.description,
        'priority', NEW.priority,
        'category', NEW.category,
        'userEmail', COALESCE(user_email, 'Unknown'),
        'userName', COALESCE(TRIM(user_name), 'Unknown User')
      )
    );
  
  RETURN NEW;
END;
$function$;
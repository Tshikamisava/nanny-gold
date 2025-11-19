-- Add extensive logging to notify_new_support_ticket trigger function
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
  http_response RECORD;
BEGIN
  -- Log trigger execution
  RAISE NOTICE 'Trigger notify_new_support_ticket fired for ticket %', NEW.id;
  
  -- Get user details
  SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')), email
  INTO user_name, user_email
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  RAISE NOTICE 'User details: name=%, email=%', user_name, user_email;
  
  -- Get service role key from vault
  SELECT decrypted_secret INTO service_role_secret
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;
  
  IF service_role_secret IS NULL THEN
    RAISE WARNING 'Service role key not found in vault - email notification will not be sent';
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'Service role key retrieved successfully';
  
  -- Call the edge function with properly constructed headers
  SELECT * INTO http_response FROM net.http_post(
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
  
  RAISE NOTICE 'HTTP response status: %, body: %', http_response.status, http_response.content;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_new_support_ticket: %, DETAIL: %', SQLERRM, SQLSTATE;
    -- Don't fail the insert if notification fails
    RETURN NEW;
END;
$function$;
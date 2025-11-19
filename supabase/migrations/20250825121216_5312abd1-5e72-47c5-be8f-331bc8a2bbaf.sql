-- Create a trigger function to automatically email new support tickets
CREATE OR REPLACE FUNCTION notify_new_support_ticket()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_email TEXT;
BEGIN
  -- Get user details
  SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')), email
  INTO user_name, user_email
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Call the edge function to send email notification
  PERFORM
    net.http_post(
      url := 'https://msawldkygbsipjmjuyue.supabase.co/functions/v1/notify-support-ticket',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) || '"}'::jsonb,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire after support ticket insertion
DROP TRIGGER IF EXISTS trigger_notify_new_support_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_new_support_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_support_ticket();
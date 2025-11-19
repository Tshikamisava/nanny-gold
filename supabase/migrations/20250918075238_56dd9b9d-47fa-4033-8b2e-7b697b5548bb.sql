-- Fix the nanny approval trigger function by removing updated_at reference
CREATE OR REPLACE FUNCTION public.auto_approve_documents_on_nanny_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If nanny approval status changed to approved, approve all their documents
  IF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
    -- Update documents in the correct nanny_documents table (without updated_at column)
    UPDATE public.nanny_documents 
    SET verification_status = 'approved',
        verified_at = now()
    WHERE nanny_id = NEW.id 
      AND verification_status IN ('pending', 'rejected');
    
    -- Also update nanny verification status to reflect approval
    NEW.verification_status := 'verified';
    NEW.is_verified := true;
    NEW.can_receive_bookings := true;
    NEW.verification_completed_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;
-- Create function to automatically approve documents when nanny is approved
CREATE OR REPLACE FUNCTION public.auto_approve_documents_on_nanny_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If nanny approval status changed to approved, approve all their documents
  IF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
    UPDATE public.documents 
    SET verification_status = 'approved',
        updated_at = now()
    WHERE user_id = NEW.id 
      AND verification_status IN ('pending', 'rejected');
    
    -- Also update nanny verification status to reflect approval
    NEW.verification_status := 'verified';
    NEW.is_verified := true;
    NEW.can_receive_bookings := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to call the function when nanny approval status changes
DROP TRIGGER IF EXISTS trigger_auto_approve_documents ON public.nannies;
CREATE TRIGGER trigger_auto_approve_documents
  BEFORE UPDATE ON public.nannies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_documents_on_nanny_approval();
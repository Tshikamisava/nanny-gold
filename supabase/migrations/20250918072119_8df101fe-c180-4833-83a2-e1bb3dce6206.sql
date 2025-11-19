-- First drop the dependent trigger, then the function, then recreate both with correct table references
DROP TRIGGER IF EXISTS trigger_auto_approve_documents ON public.nannies;
DROP FUNCTION IF EXISTS public.auto_approve_documents_on_nanny_approval();

-- Create the corrected function to reference the proper table and columns
CREATE OR REPLACE FUNCTION public.auto_approve_documents_on_nanny_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If nanny approval status changed to approved, approve all their documents
  IF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
    -- Update documents in the correct nanny_documents table
    UPDATE public.nanny_documents 
    SET verification_status = 'approved',
        verified_at = now(),
        updated_at = now()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_auto_approve_documents
AFTER UPDATE ON public.nannies
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_documents_on_nanny_approval();

-- Create payment_proofs table for EFT system
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  booking_id UUID,
  invoice_id UUID,
  proof_file_url TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_proofs
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_proofs
CREATE POLICY "Clients can insert their own payment proofs" ON public.payment_proofs
FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view their own payment proofs" ON public.payment_proofs
FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all payment proofs" ON public.payment_proofs
FOR ALL USING (is_admin());
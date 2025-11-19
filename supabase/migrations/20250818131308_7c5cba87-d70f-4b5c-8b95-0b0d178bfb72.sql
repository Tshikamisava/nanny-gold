-- Fix rejected nannies by resetting them to pending status
-- Investigation shows nannies were automatically rejected without admin action

UPDATE public.nannies 
SET 
  approval_status = 'pending',
  approved_by = NULL,
  approved_at = NULL,
  admin_notes = 'Reset from automatic rejection - requires manual review'
WHERE approval_status = 'rejected' 
  AND approved_by IS NULL 
  AND admin_notes IS NULL;
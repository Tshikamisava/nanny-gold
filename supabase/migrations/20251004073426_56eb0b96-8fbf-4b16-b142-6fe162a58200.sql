-- Add email tracking and invoice type columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_sent_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_sent_to text,
ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'monthly_recurring';

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.email_sent_at IS 'Timestamp of last email sent for this invoice';
COMMENT ON COLUMN public.invoices.email_sent_count IS 'Number of times email has been sent for this invoice';
COMMENT ON COLUMN public.invoices.last_email_sent_to IS 'Email address where invoice was last sent';
COMMENT ON COLUMN public.invoices.invoice_type IS 'Type of invoice: monthly_recurring, one_time, placement_fee';
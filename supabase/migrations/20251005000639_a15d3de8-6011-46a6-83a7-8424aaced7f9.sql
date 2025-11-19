-- Create invoice_email_logs table for Phase 6
CREATE TABLE invoice_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  resend_email_id text,
  recipient_email text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'sent',
  opened_at timestamp with time zone,
  bounce_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_invoice_email_logs_invoice ON invoice_email_logs(invoice_id);
CREATE INDEX idx_invoice_email_logs_status ON invoice_email_logs(delivery_status);

-- Enable RLS
ALTER TABLE invoice_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_email_logs
CREATE POLICY "Admins can view all email logs"
ON invoice_email_logs FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "System can insert email logs"
ON invoice_email_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update email logs"
ON invoice_email_logs FOR UPDATE
TO authenticated
USING (true);

-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoice-pdfs', 'invoice-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for invoice PDFs
CREATE POLICY "Authenticated users can view invoice PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoice-pdfs');

CREATE POLICY "System can upload invoice PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-pdfs');
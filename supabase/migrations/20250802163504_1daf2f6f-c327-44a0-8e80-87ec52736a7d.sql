-- Create operating costs table for tracking NannyGold expenses
CREATE TABLE public.operating_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'payment_gateway', 'google_suite', 'rent', 'tech_building', 'nanny_payments', 'refunds', 'other'
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  cost_date DATE NOT NULL,
  recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT, -- 'monthly', 'yearly', 'quarterly'
  vendor TEXT,
  reference_id TEXT, -- External reference like invoice number
  status TEXT DEFAULT 'confirmed', -- 'pending', 'confirmed', 'disputed'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoices table for client billing
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  due_date DATE NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  paid_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'paid', 'overdue', 'cancelled'
  payment_method TEXT, -- 'bank_transfer', 'card', 'cash'
  payment_reference TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create nanny payment advice table
CREATE TABLE public.nanny_payment_advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL,
  advice_number TEXT UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_deducted DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'generated', -- 'generated', 'sent', 'acknowledged'
  payment_date DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_reference TEXT,
  booking_details JSONB DEFAULT '[]'::jsonb, -- Array of booking IDs and amounts
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operating_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nanny_payment_advice ENABLE ROW LEVEL SECURITY;

-- Operating costs policies (Admin only)
CREATE POLICY "Admins can manage operating costs" ON public.operating_costs
FOR ALL USING (is_admin());

-- Invoice policies
CREATE POLICY "Admins can manage all invoices" ON public.invoices
FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their invoices" ON public.invoices
FOR SELECT USING (auth.uid() = client_id);

-- Nanny payment advice policies
CREATE POLICY "Admins can manage payment advice" ON public.nanny_payment_advice
FOR ALL USING (is_admin());

CREATE POLICY "Nannies can view their payment advice" ON public.nanny_payment_advice
FOR SELECT USING (auth.uid() = nanny_id);

-- Add updated_at triggers
CREATE TRIGGER update_operating_costs_updated_at
BEFORE UPDATE ON public.operating_costs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nanny_payment_advice_updated_at
BEFORE UPDATE ON public.nanny_payment_advice
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ '^INV-\d+$';
  
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate payment advice numbers
CREATE OR REPLACE FUNCTION public.generate_advice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  advice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(advice_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.nanny_payment_advice
  WHERE advice_number ~ '^ADV-\d+$';
  
  advice_num := 'ADV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN advice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
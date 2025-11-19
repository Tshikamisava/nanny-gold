-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'booking', 'payment', 'technical', 'dispute', 'bespoke_arrangement')),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Create support chat messages table
CREATE TABLE public.support_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  attachment_url TEXT
);

-- Create disputes table
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  raised_by UUID NOT NULL,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('payment', 'service_quality', 'cancellation', 'refund', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create FAQ articles table (allow created_by to be nullable initially)
CREATE TABLE public.faq_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  keywords TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_response_enabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_count INTEGER DEFAULT 0
);

-- Create auto response templates table (allow created_by to be nullable initially)
CREATE TABLE public.auto_response_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  trigger_keywords TEXT[],
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_response_templates ENABLE ROW LEVEL SECURITY;

-- Support tickets policies
CREATE POLICY "Users can create support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (is_admin());

-- Chat messages policies
CREATE POLICY "Users can view messages for their tickets" ON public.support_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "Users can send messages for their tickets" ON public.support_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all chat messages" ON public.support_chat_messages
  FOR ALL USING (is_admin());

-- Disputes policies
CREATE POLICY "Users can create disputes for their bookings" ON public.disputes
  FOR INSERT WITH CHECK (
    auth.uid() = raised_by AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = booking_id AND (client_id = auth.uid() OR nanny_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their disputes" ON public.disputes
  FOR SELECT USING (
    auth.uid() = raised_by OR
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = booking_id AND (client_id = auth.uid() OR nanny_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all disputes" ON public.disputes
  FOR ALL USING (is_admin());

-- FAQ policies
CREATE POLICY "Anyone can view active FAQ articles" ON public.faq_articles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage FAQ articles" ON public.faq_articles
  FOR ALL USING (is_admin());

-- Auto response templates policies
CREATE POLICY "Admins can manage auto response templates" ON public.auto_response_templates
  FOR ALL USING (is_admin());

-- Create triggers for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_articles_updated_at
  BEFORE UPDATE ON public.faq_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auto_response_templates_updated_at
  BEFORE UPDATE ON public.auto_response_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-assign tickets based on category
CREATE OR REPLACE FUNCTION public.auto_assign_support_ticket()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get available admin (simple round-robin based on least assigned tickets)
  SELECT ur.user_id INTO admin_id
  FROM public.user_roles ur
  LEFT JOIN public.support_tickets st ON st.assigned_to = ur.user_id AND st.status IN ('open', 'in_progress')
  WHERE ur.role = 'admin'
  GROUP BY ur.user_id
  ORDER BY COUNT(st.id) ASC
  LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    NEW.assigned_to := admin_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-assignment
CREATE TRIGGER auto_assign_support_ticket_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_support_ticket();

-- Insert sample FAQ articles (without created_by for now)
INSERT INTO public.faq_articles (question, answer, category, keywords, auto_response_enabled) VALUES
('How do I book a nanny?', 'To book a nanny, go to our booking page, select your preferences, choose from available nannies, and complete the payment process.', 'booking', ARRAY['book', 'booking', 'nanny', 'how to'], true),
('What payment methods do you accept?', 'We accept all major credit cards, debit cards, and bank transfers. Payments are processed securely through our payment gateway.', 'payment', ARRAY['payment', 'card', 'bank', 'transfer'], true),
('How are nannies vetted?', 'All nannies undergo comprehensive background checks, reference verification, skills assessment, and document verification before approval.', 'general', ARRAY['vet', 'background', 'check', 'verification'], true),
('Can I cancel a booking?', 'Yes, you can cancel bookings up to 24 hours in advance. Cancellation fees may apply depending on the timing and booking type.', 'booking', ARRAY['cancel', 'cancellation', 'refund'], true),
('How do I contact my nanny?', 'You can contact your nanny through the in-app messaging system available in your dashboard after booking confirmation.', 'general', ARRAY['contact', 'message', 'nanny', 'communication'], true);

-- Insert sample auto-response templates (without created_by for now)
INSERT INTO public.auto_response_templates (name, subject_template, body_template, trigger_keywords, category) VALUES
('Booking Inquiry', 'Thank you for your booking inquiry', 'Thank you for contacting NannyGold! We have received your booking inquiry and will respond within 2 hours. For immediate assistance, please call our support line.', ARRAY['booking', 'book', 'nanny'], 'booking'),
('Payment Issue', 'Payment Support - We''re here to help', 'Thank you for contacting us about your payment concern. Our payment specialists will review your case and respond within 4 hours. For urgent payment issues, please call our support line.', ARRAY['payment', 'card', 'charge', 'billing'], 'payment'),
('General Support', 'NannyGold Support - We''ve received your message', 'Thank you for contacting NannyGold support! We have received your message and will respond within 24 hours. For urgent matters, please call our support hotline.', ARRAY['help', 'support', 'question'], 'general');
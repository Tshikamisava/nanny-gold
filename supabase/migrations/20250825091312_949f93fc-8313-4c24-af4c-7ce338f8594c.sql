-- Create sample test data for development and testing

-- First, create some test admin users (for development)
DO $$
DECLARE
  test_admin_id UUID;
  test_client_id UUID;
  test_nanny_id UUID;
  test_booking_id UUID;
BEGIN
  -- Create test admin profile (only if not exists)
  INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (
    '11111111-1111-1111-1111-111111111111'::UUID,
    'admin@nannygold.dev',
    '{"user_type": "admin", "first_name": "Test", "last_name": "Admin"}'::jsonb,
    now(),
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  -- Create test client profile
  INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (
    '22222222-2222-2222-2222-222222222222'::UUID,
    'client@nannygold.dev',
    '{"user_type": "client", "first_name": "Test", "last_name": "Client"}'::jsonb,
    now(),
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  -- Create test nanny profile
  INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  VALUES (
    '33333333-3333-3333-3333-333333333333'::UUID,
    'nanny@nannygold.dev',
    '{"user_type": "nanny", "first_name": "Test", "last_name": "Nanny"}'::jsonb,
    now(),
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert profiles
  INSERT INTO public.profiles (id, user_type, first_name, last_name, email, phone, location)
  VALUES 
    ('11111111-1111-1111-1111-111111111111'::UUID, 'admin', 'Test', 'Admin', 'admin@nannygold.dev', '+27123456789', 'Cape Town, South Africa'),
    ('22222222-2222-2222-2222-222222222222'::UUID, 'client', 'Test', 'Client', 'client@nannygold.dev', '+27123456790', 'Johannesburg, South Africa'),
    ('33333333-3333-3333-3333-333333333333'::UUID, 'nanny', 'Test', 'Nanny', 'nanny@nannygold.dev', '+27123456791', 'Cape Town, South Africa')
  ON CONFLICT (id) DO NOTHING;

  -- Create client record
  INSERT INTO public.clients (id, number_of_children, children_ages, home_size)
  VALUES (
    '22222222-2222-2222-2222-222222222222'::UUID,
    2,
    ARRAY['3', '7'],
    'medium'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create nanny record
  INSERT INTO public.nannies (id, bio, experience_level, hourly_rate, monthly_rate, languages, skills, approval_status, is_verified, verification_status)
  VALUES (
    '33333333-3333-3333-3333-333333333333'::UUID,
    'Experienced nanny with a passion for childcare and early childhood development.',
    '3-5',
    180,
    7200,
    ARRAY['English', 'Afrikaans'],
    ARRAY['Childcare', 'First Aid', 'Early Childhood Development'],
    'approved',
    true,
    'verified'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create sample bookings
  INSERT INTO public.bookings (id, client_id, nanny_id, status, start_date, end_date, schedule, base_rate, total_monthly_cost, booking_type, created_at)
  VALUES 
    (
      '44444444-4444-4444-4444-444444444444'::UUID,
      '22222222-2222-2222-2222-222222222222'::UUID,
      '33333333-3333-3333-3333-333333333333'::UUID,
      'confirmed',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      '{"monday": {"start": "08:00", "end": "17:00"}, "tuesday": {"start": "08:00", "end": "17:00"}, "wednesday": {"start": "08:00", "end": "17:00"}, "thursday": {"start": "08:00", "end": "17:00"}, "friday": {"start": "08:00", "end": "17:00"}}'::jsonb,
      7200,
      7200,
      'long_term',
      CURRENT_DATE - INTERVAL '5 days'
    ),
    (
      '55555555-5555-5555-5555-555555555555'::UUID,
      '22222222-2222-2222-2222-222222222222'::UUID,
      '33333333-3333-3333-3333-333333333333'::UUID,
      'pending',
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '37 days',
      '{"monday": {"start": "09:00", "end": "16:00"}, "tuesday": {"start": "09:00", "end": "16:00"}, "wednesday": {"start": "09:00", "end": "16:00"}}'::jsonb,
      6500,
      6500,
      'long_term',
      CURRENT_DATE - INTERVAL '2 days'
    )
  ON CONFLICT (id) DO NOTHING;

  -- Create sample payment method
  INSERT INTO public.client_payment_methods (id, client_id, paystack_authorization_code, card_type, last_four, exp_month, exp_year, bank, is_default)
  VALUES (
    '66666666-6666-6666-6666-666666666666'::UUID,
    '22222222-2222-2222-2222-222222222222'::UUID,
    'AUTH_test123456789',
    'visa',
    '4242',
    '12',
    '2028',
    'Test Bank',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Create sample invoices
  INSERT INTO public.invoices (id, client_id, booking_id, invoice_number, amount, due_date, status, line_items)
  VALUES 
    (
      '77777777-7777-7777-7777-777777777777'::UUID,
      '22222222-2222-2222-2222-222222222222'::UUID,
      '44444444-4444-4444-4444-444444444444'::UUID,
      'INV-000001',
      7200,
      CURRENT_DATE + INTERVAL '15 days',
      'paid',
      '[{"description": "Monthly Nanny Service", "amount": 7200, "quantity": 1}]'::jsonb
    ),
    (
      '88888888-8888-8888-8888-888888888888'::UUID,
      '22222222-2222-2222-2222-222222222222'::UUID,
      '55555555-5555-5555-5555-555555555555'::UUID,
      'INV-000002',
      6500,
      CURRENT_DATE + INTERVAL '30 days',
      'pending',
      '[{"description": "Monthly Nanny Service", "amount": 6500, "quantity": 1}]'::jsonb
    )
  ON CONFLICT (id) DO NOTHING;

  -- Create sample favorite
  INSERT INTO public.favorite_nannies (id, user_id, nanny_id)
  VALUES (
    '99999999-9999-9999-9999-999999999999'::UUID,
    '22222222-2222-2222-2222-222222222222'::UUID,
    '33333333-3333-3333-3333-333333333333'::UUID
  ) ON CONFLICT (id) DO NOTHING;

  -- Create sample notifications table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    data JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  );

  -- Enable RLS on notifications if it exists
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

  -- Create policies for notifications
  DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
  CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
  CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
  CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

  -- Create sample notifications
  INSERT INTO public.notifications (id, user_id, title, message, type, data)
  VALUES 
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID,
      '22222222-2222-2222-2222-222222222222'::UUID,
      'Booking Confirmed',
      'Your booking with Test Nanny has been confirmed for next week.',
      'booking_confirmed',
      '{"booking_id": "44444444-4444-4444-4444-444444444444"}'::jsonb
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
      '33333333-3333-3333-3333-333333333333'::UUID,
      'New Booking Request',
      'You have a new booking request from Test Client.',
      'booking_request',
      '{"booking_id": "55555555-5555-5555-5555-555555555555"}'::jsonb
    )
  ON CONFLICT (id) DO NOTHING;

END $$;
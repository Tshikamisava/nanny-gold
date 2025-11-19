
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_type AS ENUM ('client', 'nanny');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected');
CREATE TYPE living_arrangement AS ENUM ('live-in', 'live-out');
CREATE TYPE experience_level AS ENUM ('1-3', '3-6', '6+');
CREATE TYPE backup_request_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create nannies table (for nanny-specific data)
CREATE TABLE public.nannies (
  id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experience_level experience_level NOT NULL DEFAULT '1-3',
  hourly_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  bio TEXT,
  languages TEXT[],
  skills TEXT[],
  certifications TEXT[],
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create nanny skills/services table
CREATE TABLE public.nanny_services (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,
  pet_care BOOLEAN DEFAULT false,
  cooking BOOLEAN DEFAULT false,
  special_needs BOOLEAN DEFAULT false,
  ecd_training BOOLEAN DEFAULT false,
  montessori BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(nanny_id)
);

-- Create clients table (for client-specific data)
CREATE TABLE public.clients (
  id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  number_of_children INTEGER,
  children_ages INTEGER[],
  special_requirements TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create client preferences table
CREATE TABLE public.client_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  living_arrangement living_arrangement,
  experience_level experience_level,
  languages TEXT,
  pet_care BOOLEAN DEFAULT false,
  cooking BOOLEAN DEFAULT false,
  special_needs BOOLEAN DEFAULT false,
  ecd_training BOOLEAN DEFAULT false,
  montessori BOOLEAN DEFAULT false,
  backup_nanny BOOLEAN DEFAULT false,
  schedule JSONB,
  max_budget DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(client_id)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE,
  schedule JSONB,
  living_arrangement living_arrangement,
  services JSONB,
  base_rate DECIMAL(10,2) NOT NULL,
  additional_services_cost DECIMAL(10,2) DEFAULT 0,
  total_monthly_cost DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create backup nanny requests table
CREATE TABLE public.backup_nanny_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  original_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  backup_nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,
  status backup_request_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  client_response_deadline TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  PRIMARY KEY (id)
);

-- Create nanny availability table
CREATE TABLE public.nanny_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,
  available_dates DATE[],
  unavailable_dates DATE[],
  schedule JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(nanny_id)
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(booking_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nannies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nanny_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_nanny_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nanny_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for nannies
CREATE POLICY "Anyone can view nannies" ON public.nannies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Nannies can update their own profile" ON public.nannies FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Nannies can insert their own profile" ON public.nannies FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for nanny services
CREATE POLICY "Anyone can view nanny services" ON public.nanny_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Nannies can manage their services" ON public.nanny_services FOR ALL USING (auth.uid() = nanny_id);

-- RLS Policies for clients
CREATE POLICY "Clients can view their own profile" ON public.clients FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Clients can update their own profile" ON public.clients FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Clients can insert their own profile" ON public.clients FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for client preferences
CREATE POLICY "Clients can manage their preferences" ON public.client_preferences FOR ALL USING (auth.uid() = client_id);

-- RLS Policies for bookings
CREATE POLICY "Users can view their bookings" ON public.bookings FOR SELECT USING (auth.uid() = client_id OR auth.uid() = nanny_id);
CREATE POLICY "Clients can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update their bookings" ON public.bookings FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = nanny_id);

-- RLS Policies for backup nanny requests
CREATE POLICY "Users can view their backup requests" ON public.backup_nanny_requests FOR SELECT USING (auth.uid() = client_id OR auth.uid() = backup_nanny_id);
CREATE POLICY "System can create backup requests" ON public.backup_nanny_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update backup requests" ON public.backup_nanny_requests FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = backup_nanny_id);

-- RLS Policies for nanny availability
CREATE POLICY "Anyone can view nanny availability" ON public.nanny_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Nannies can manage their availability" ON public.nanny_availability FOR ALL USING (auth.uid() = nanny_id);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clients can create reviews for their bookings" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = client_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client')::user_type,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update nanny rating when review is added
CREATE OR REPLACE FUNCTION public.update_nanny_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.nannies
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.reviews
      WHERE nanny_id = NEW.nanny_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE nanny_id = NEW.nanny_id
    ),
    updated_at = now()
  WHERE id = NEW.nanny_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update nanny rating
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_nanny_rating();

-- Function to create backup nanny request when booking is rejected
CREATE OR REPLACE FUNCTION public.handle_booking_rejection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  client_has_backup BOOLEAN;
  backup_nanny_id UUID;
BEGIN
  -- Only trigger when status changes to 'rejected'
  IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    -- Check if client has backup nanny preference enabled
    SELECT backup_nanny INTO client_has_backup
    FROM public.client_preferences
    WHERE client_id = NEW.client_id;
    
    IF client_has_backup THEN
      -- Find an available backup nanny with similar preferences
      SELECT n.id INTO backup_nanny_id
      FROM public.nannies n
      JOIN public.nanny_services ns ON n.id = ns.nanny_id
      JOIN public.client_preferences cp ON cp.client_id = NEW.client_id
      WHERE n.is_available = true
        AND n.id != NEW.nanny_id
        AND (cp.experience_level IS NULL OR n.experience_level = cp.experience_level)
      ORDER BY n.rating DESC
      LIMIT 1;
      
      -- Create backup nanny request if backup nanny found
      IF backup_nanny_id IS NOT NULL THEN
        INSERT INTO public.backup_nanny_requests (
          original_booking_id,
          client_id,
          backup_nanny_id,
          reason,
          client_response_deadline
        ) VALUES (
          NEW.id,
          NEW.client_id,
          backup_nanny_id,
          'Original nanny rejected booking',
          now() + INTERVAL '24 hours'
        );
        
        -- Create notification for client
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          data
        ) VALUES (
          NEW.client_id,
          'Backup Nanny Available',
          'Your original booking was rejected, but we found a backup nanny for you. Please review and accept within 24 hours.',
          'backup_nanny_request',
          jsonb_build_object('backup_request_id', (SELECT id FROM public.backup_nanny_requests WHERE original_booking_id = NEW.id ORDER BY requested_at DESC LIMIT 1))
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for handling booking rejections
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_rejection();

-- Function to automatically accept backup nanny if deadline passes
CREATE OR REPLACE FUNCTION public.auto_accept_backup_nanny()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Auto-accept backup nanny requests where deadline has passed
  UPDATE public.backup_nanny_requests
  SET 
    status = 'accepted',
    responded_at = now()
  WHERE status = 'pending'
    AND client_response_deadline < now();
    
  -- Create new bookings for auto-accepted backup requests
  INSERT INTO public.bookings (
    client_id,
    nanny_id,
    status,
    start_date,
    end_date,
    schedule,
    living_arrangement,
    services,
    base_rate,
    additional_services_cost,
    total_monthly_cost
  )
  SELECT 
    bnr.client_id,
    bnr.backup_nanny_id,
    'confirmed',
    b.start_date,
    b.end_date,
    b.schedule,
    b.living_arrangement,
    b.services,
    n.monthly_rate,
    b.additional_services_cost,
    n.monthly_rate + b.additional_services_cost
  FROM public.backup_nanny_requests bnr
  JOIN public.bookings b ON b.id = bnr.original_booking_id
  JOIN public.nannies n ON n.id = bnr.backup_nanny_id
  WHERE bnr.status = 'accepted'
    AND bnr.responded_at = now()
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE client_id = bnr.client_id 
        AND nanny_id = bnr.backup_nanny_id 
        AND status = 'confirmed'
    );
END;
$$;

-- Enable realtime for key tables
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.backup_nanny_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.backup_nanny_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

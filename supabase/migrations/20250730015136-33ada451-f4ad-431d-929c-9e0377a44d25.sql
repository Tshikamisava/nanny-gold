-- Add 'admin' to the user_type enum
ALTER TYPE user_type ADD VALUE 'admin';

-- Create admins table for admin-specific data
CREATE TABLE public.admins (
  id UUID NOT NULL PRIMARY KEY,
  department TEXT,
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admins table
CREATE POLICY "Admins can view their own profile" 
ON public.admins 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can update their own profile" 
ON public.admins 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can insert their own profile" 
ON public.admins 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "System admins can manage all admin profiles" 
ON public.admins 
FOR ALL 
USING (is_admin());

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clients_updated_at();
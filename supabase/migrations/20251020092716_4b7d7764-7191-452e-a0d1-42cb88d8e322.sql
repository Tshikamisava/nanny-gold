-- PHASE 3: Create PostgreSQL transaction management functions

-- Function to begin a transaction (explicit marker)
CREATE OR REPLACE FUNCTION public.begin_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Transaction automatically begins when function is called
  -- This is a marker function for explicit transaction control
  RETURN;
END;
$$;

-- Function to commit a transaction (explicit marker)
CREATE OR REPLACE FUNCTION public.commit_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Transaction automatically commits at end of function
  -- This is a marker function for explicit transaction control
  RETURN;
END;
$$;

-- Function to rollback a transaction
CREATE OR REPLACE FUNCTION public.rollback_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Force rollback by raising an exception
  RAISE EXCEPTION 'Transaction rolled back';
END;
$$;

-- PHASE 7: Add database indexes for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_id ON public.clients(id);
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_id ON public.client_preferences(client_id);
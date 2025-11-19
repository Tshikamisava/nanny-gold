-- Ensure clients table has all necessary family information columns
-- Add missing columns if they don't exist (using conditional approach)

-- First check if we need to add the number_of_children column calculation trigger
DO $$
BEGIN
  -- Add function to automatically calculate number_of_children from children_ages array
  CREATE OR REPLACE FUNCTION public.update_children_count()
  RETURNS TRIGGER AS $trigger$
  BEGIN
    -- Calculate number of children from the length of children_ages array
    NEW.number_of_children := CASE 
      WHEN NEW.children_ages IS NULL THEN 0
      ELSE array_length(NEW.children_ages, 1)
    END;
    RETURN NEW;
  END;
  $trigger$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

  -- Create trigger to auto-update number_of_children when children_ages changes
  DROP TRIGGER IF EXISTS update_children_count_trigger ON public.clients;
  CREATE TRIGGER update_children_count_trigger
    BEFORE INSERT OR UPDATE OF children_ages ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_children_count();

END $$;
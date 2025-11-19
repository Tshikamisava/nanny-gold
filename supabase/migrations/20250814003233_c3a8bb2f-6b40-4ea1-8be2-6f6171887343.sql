-- Drop the trigger that depends on children_ages
DROP TRIGGER IF EXISTS update_children_count_trigger ON public.clients;

-- Drop the function that the trigger uses
DROP FUNCTION IF EXISTS public.update_children_count();

-- Update children_ages column to accept text array instead of number array
ALTER TABLE public.clients ALTER COLUMN children_ages TYPE text[] USING children_ages::text[];

-- Recreate the function to work with text array
CREATE OR REPLACE FUNCTION public.update_children_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    -- Calculate number of children from the length of children_ages array
    -- Filter out empty strings
    NEW.number_of_children := CASE 
      WHEN NEW.children_ages IS NULL THEN 0
      WHEN array_length(NEW.children_ages, 1) IS NULL THEN 0
      ELSE array_length(array_remove(NEW.children_ages, ''), 1)
    END;
    RETURN NEW;
  END;
$function$;

-- Recreate the trigger
CREATE TRIGGER update_children_count_trigger
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_children_count();
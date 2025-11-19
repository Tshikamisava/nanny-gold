-- Update children_ages column to accept text array instead of number array
ALTER TABLE public.clients ALTER COLUMN children_ages TYPE text[] USING children_ages::text[];
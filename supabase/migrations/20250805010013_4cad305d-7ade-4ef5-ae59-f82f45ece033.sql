-- Create favorite_nannies table
CREATE TABLE public.favorite_nannies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL REFERENCES public.nannies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, nanny_id)
);

-- Enable RLS
ALTER TABLE public.favorite_nannies ENABLE ROW LEVEL SECURITY;

-- Create policies for favorite_nannies
CREATE POLICY "Users can view their own favorites" 
ON public.favorite_nannies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites" 
ON public.favorite_nannies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites" 
ON public.favorite_nannies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE TRIGGER update_favorite_nannies_updated_at
BEFORE UPDATE ON public.favorite_nannies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_favorite_nannies_user_id ON public.favorite_nannies(user_id);
CREATE INDEX idx_favorite_nannies_nanny_id ON public.favorite_nannies(nanny_id);
CREATE INDEX idx_favorite_nannies_created_at ON public.favorite_nannies(created_at DESC);
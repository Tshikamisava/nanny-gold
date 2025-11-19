-- Create the missing nanny record for the existing user
INSERT INTO public.nannies (
  id, 
  experience_level, 
  hourly_rate, 
  monthly_rate, 
  bio, 
  languages, 
  skills, 
  certifications,
  approval_status
) VALUES (
  'e123ab33-7a72-471f-9078-165b87136ade',
  '1-3'::experience_level,
  150,
  6000,
  'Hi, I''m Bontle! I''m a dedicated nanny looking to provide exceptional care for your family.',
  ARRAY['English'],
  ARRAY['Childcare', 'First Aid'], 
  ARRAY[]::text[],
  'pending'
);
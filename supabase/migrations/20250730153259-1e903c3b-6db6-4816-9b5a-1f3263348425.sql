-- Test the handle_new_user function with a sample user
DO $$
DECLARE
  test_user_id UUID := '47550295-485e-4306-a159-335212130078';
  test_result RECORD;
BEGIN
  -- Try to manually call what the trigger would do
  RAISE NOTICE 'Testing nanny profile creation for user: %', test_user_id;
  
  -- Check if nanny record already exists
  SELECT * INTO test_result FROM public.nannies WHERE id = test_user_id;
  
  IF test_result IS NULL THEN
    RAISE NOTICE 'No nanny record found, attempting to create...';
    
    -- Try to insert nanny record manually
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
      test_user_id,
      '1-3'::experience_level,
      150,
      6000,
      'Hi, I''m Nanny! I''m a dedicated nanny looking to provide exceptional care for your family.',
      ARRAY['English'],
      ARRAY['Childcare', 'First Aid'], 
      ARRAY[]::text[],
      'pending'
    );
    
    RAISE NOTICE 'Nanny record created successfully';
  ELSE
    RAISE NOTICE 'Nanny record already exists';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating nanny record: % - %', SQLSTATE, SQLERRM;
END $$;
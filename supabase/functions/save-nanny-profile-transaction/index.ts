import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  bio?: string;
  experience_level?: string;
  languages?: string[];
  skills?: string[];
  hourly_rate?: number;
  monthly_rate?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { profileData } = await req.json() as { profileData: ProfileData };
    
    console.log('🔐 Nanny profile transaction save for user:', user.id);
    console.log('📦 Profile data:', profileData);

    const profileFields = ['first_name', 'last_name', 'email', 'phone', 'location', 'avatar_url'];
    const nannyFields = ['bio', 'experience_level', 'languages', 'skills', 'hourly_rate', 'monthly_rate'];

    const profileUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    const nannyUpdates: Record<string, any> = { updated_at: new Date().toISOString() };

    Object.entries(profileData).forEach(([key, value]) => {
      if (profileFields.includes(key) && value !== undefined) {
        profileUpdates[key] = value;
      } else if (nannyFields.includes(key) && value !== undefined) {
        nannyUpdates[key] = value;
      }
    });

    console.log('📝 Profile updates to apply:', JSON.stringify(profileUpdates, null, 2));
    console.log('📝 Nanny updates to apply:', JSON.stringify(nannyUpdates, null, 2));

    let savedProfileData: any = null;
    let savedNannyData: any = null;

    // 1. Update profiles table if there are profile fields
    if (Object.keys(profileUpdates).length > 1) { // More than just updated_at
      console.log('💾 Updating profiles table with:', Object.keys(profileUpdates));
      const { data: profileResult, error: profileError } = await supabaseClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)
        .select()
        .single(); // Use single() to get the actual saved record

      if (profileError) {
        console.error('❌ Profiles update failed:', profileError);
        throw new Error(`Profiles update failed: ${profileError.message}`);
      }
      
      if (!profileResult) {
        console.error('⚠️ Profiles update returned no data - record may not exist');
        throw new Error('Profile update returned no data - record may not exist');
      }
      
      savedProfileData = profileResult;
      console.log('✅ Profiles table updated successfully');
      console.log('📄 Saved profile data:', savedProfileData);
    }

    // 2. Update nannies table if there are nanny fields
    if (Object.keys(nannyUpdates).length > 1) { // More than just updated_at
      console.log('💾 Updating nannies table with:', Object.keys(nannyUpdates));
      const { data: nannyResult, error: nannyError } = await supabaseClient
        .from('nannies')
        .update(nannyUpdates)
        .eq('id', user.id)
        .select()
        .single(); // Use single() to get the actual saved record

      if (nannyError) {
        console.error('❌ Nannies update failed:', nannyError);
        throw new Error(`Nannies update failed: ${nannyError.message}`);
      }
      
      if (!nannyResult) {
        console.error('⚠️ Nannies update returned no data - record may not exist');
        throw new Error('Nanny update returned no data - record may not exist');
      }
      
      savedNannyData = nannyResult;
      console.log('✅ Nannies table updated successfully');
      console.log('📄 Saved nanny data:', savedNannyData);
    }

    // Get actual saved data from database (load both tables if updates were skipped)
    if (!savedProfileData) {
      const { data: existingProfile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      savedProfileData = existingProfile;
    }
    
    if (!savedNannyData) {
      const { data: existingNanny } = await supabaseClient
        .from('nannies')
        .select('*')
        .eq('id', user.id)
        .single();
      savedNannyData = existingNanny;
    }

    // Combine saved data from database (actual saved state)
    const combinedSavedData = {
      ...(savedProfileData || {}),
      ...(savedNannyData || {})
    };

    console.log('🎉 Nanny profile saved successfully');
    console.log('📦 Combined saved data being returned:', Object.keys(combinedSavedData));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile saved successfully',
        savedData: combinedSavedData // Return actual saved data from database, not just updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          userMessage: 'An unexpected error occurred. Please try again.'
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  streetAddress?: string;
  estateInfo?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  childrenAges?: string[];
  otherDependents?: number;
  petsInHome?: string;
  homeSize?: string;
  specialNeeds?: boolean;
  ecdTraining?: boolean;
  drivingSupport?: boolean;
  cooking?: boolean;
  languages?: string;
  montessori?: boolean;
  schedule?: Record<string, boolean>;
  backupNanny?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    
    console.log('🔐 Simple profile save for user:', user.id);
    console.log('📦 Profile data:', profileData);

    // Build address JSON object
    const addressJson = {
      street: profileData.streetAddress || '',
      estate: profileData.estateInfo || '',
      suburb: profileData.suburb || '',
      city: profileData.city || '',
      province: profileData.province || '',
      postal: profileData.postalCode || ''
    };

    // Check if address has any non-empty values
    const hasAddressData = Object.values(addressJson).some(val => val && val.trim() !== '');

    // Simple save without transactions
    try {
      // 1. Update profiles table
      const profileUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      // Only update location if there's actual address data
      if (hasAddressData) {
        profileUpdates.location = JSON.stringify(addressJson);
        console.log('📍 Updating location with address data:', addressJson);
      }
      
      // Only include personal details if they have actual values
      if (profileData.firstName && profileData.firstName.trim() !== '') {
        profileUpdates.first_name = profileData.firstName;
      }
      if (profileData.lastName && profileData.lastName.trim() !== '') {
        profileUpdates.last_name = profileData.lastName;
      }
      if (profileData.phone && profileData.phone.trim() !== '') {
        // Sanitize phone: remove all spaces
        const sanitizedPhone = profileData.phone.replace(/\s+/g, '').trim();
        
        // Validate format: must be +27XXXXXXXXX or 0XXXXXXXXX (10 digits total)
        if (/^(\+27|0)[0-9]{9}$/.test(sanitizedPhone)) {
          profileUpdates.phone = sanitizedPhone;
        } else {
          console.error('❌ Invalid phone format:', profileData.phone, '→', sanitizedPhone);
          throw new Error(`Invalid phone format: ${profileData.phone}. Must be 10 digits starting with 0 or +27.`);
        }
      }
      
      console.log('📝 Profile updates being applied:', Object.keys(profileUpdates));
      
      const { error: profilesError } = await supabaseClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profilesError) {
        console.error('❌ Profiles update failed:', profilesError);
        throw new Error(`Profiles update failed: ${profilesError.message}`);
      }
      console.log('✅ Profiles table updated');

      // 2. Update clients table
      const { error: clientsError } = await supabaseClient
        .from('clients')
        .update({
          children_ages: profileData.childrenAges?.filter(age => age.trim()) || [],
          other_dependents: profileData.otherDependents || 0,
          pets_in_home: profileData.petsInHome || null,
          home_size: profileData.homeSize || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (clientsError) {
        console.error('❌ Clients update failed:', clientsError);
        throw new Error(`Clients update failed: ${clientsError.message}`);
      }
      console.log('✅ Clients table updated');

      // 3. Update client_preferences table (upsert to handle first-time users)
      const preferencesData = {
        client_id: user.id,
        special_needs: profileData.specialNeeds || false,
        ecd_training: profileData.ecdTraining || false,
        driving_support: profileData.drivingSupport || false,
        cooking: profileData.cooking || false,
        languages: profileData.languages || null,
        montessori: profileData.montessori || false,
        schedule: profileData.schedule || {},
        backup_nanny: profileData.backupNanny || false,
        updated_at: new Date().toISOString()
      };

      const { error: preferencesError } = await supabaseClient
        .from('client_preferences')
        .upsert(preferencesData, { onConflict: 'client_id' });

      if (preferencesError) {
        console.error('❌ Preferences update failed:', preferencesError);
        throw new Error(`Preferences update failed: ${preferencesError.message}`);
      }
      console.log('✅ Preferences table updated');

      console.log('🎉 Profile saved successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile saved successfully',
          savedData: {
            name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
            phone: profileData.phone,
            address: addressJson,
            childrenAges: profileData.childrenAges?.filter(age => age.trim()),
            preferences: {
              cooking: profileData.cooking,
              specialNeeds: profileData.specialNeeds,
              montessori: profileData.montessori,
              backupNanny: profileData.backupNanny
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (saveError) {
      console.error('💥 Save operation failed:', saveError);

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: saveError instanceof Error ? saveError.message : 'Save operation failed',
            userMessage: 'Failed to save profile. Please try again.',
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

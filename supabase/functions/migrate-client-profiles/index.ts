import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Verify admin access
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

    // Check if user is admin
    const { data: adminCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminCheck) {
      throw new Error('Admin access required');
    }

    console.log('🔧 Starting client profile migration...');

    // Get all profiles with location data
    const { data: profiles, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('id, location')
      .not('location', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    const migrationResults = {
      total: profiles?.length || 0,
      migrated: 0,
      alreadyJson: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const profile of profiles || []) {
      try {
        // Check if already in JSON format
        try {
          JSON.parse(profile.location);
          migrationResults.alreadyJson++;
          console.log(`✓ Profile ${profile.id} already in JSON format`);
          continue;
        } catch {
          // Not JSON, needs migration
        }

        // Parse old string format
        const parts = profile.location.split(',').map((p: string) => p.trim());
        
        const addressJson = {
          street: parts[0] || '',
          estate: parts[1] || '',
          suburb: parts[2] || '',
          city: parts[3] || '',
          province: parts[4] || '',
          postal: parts[5] || ''
        };

        // Update to JSON format
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            location: JSON.stringify(addressJson)
          })
          .eq('id', profile.id);

        if (updateError) {
          throw updateError;
        }

        migrationResults.migrated++;
        console.log(`✓ Migrated profile ${profile.id}`);

      } catch (error) {
        migrationResults.failed++;
        migrationResults.errors.push({
          profileId: profile.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Failed to migrate profile ${profile.id}:`, error);
      }
    }

    console.log('✅ Migration complete:', migrationResults);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration completed',
        results: migrationResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

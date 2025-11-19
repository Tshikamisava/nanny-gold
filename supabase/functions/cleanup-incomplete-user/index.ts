import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupRequest {
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: CleanupRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ 
          error: 'Email is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Cleaning up incomplete user: ${email}`);

    // Check if user exists in auth.users but not in profiles
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing auth users:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check auth users' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const authUser = authUsers.users.find(user => user.email === email);
    
    if (!authUser) {
      return new Response(
        JSON.stringify({ 
          message: 'User does not exist in auth system',
          userExists: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking profile:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check user profile' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (profile) {
      return new Response(
        JSON.stringify({ 
          message: 'User exists and has complete profile',
          userExists: true,
          hasProfile: true,
          userId: authUser.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // User exists in auth but no profile - delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);
    
    if (deleteError) {
      console.error('Error deleting incomplete user:', deleteError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to cleanup incomplete user' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully cleaned up incomplete user: ${email}`);

    return new Response(
      JSON.stringify({ 
        message: 'Incomplete user cleaned up successfully',
        userExists: false,
        cleanedUp: true
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
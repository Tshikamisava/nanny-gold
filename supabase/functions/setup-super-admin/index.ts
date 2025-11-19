import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { admin_email: email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Setting up super admin for email:', email)

    // Find user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found with this email' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const userId = profile.id

    // Check if user already has admin role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single()

    // Create admin role if it doesn't exist
    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        })

      if (roleError) {
        console.error('Error creating admin role:', roleError)
        return new Response(
          JSON.stringify({ error: 'Failed to create admin role' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Check if admin profile exists
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingAdmin) {
      // Update existing admin to super admin
      const { error: updateError } = await supabase
        .from('admins')
        .update({
          admin_level: 'super_admin',
          permissions: {
            payments: true,
            analytics: true,
            professional_development: true,
            user_management: true,
            verification: true,
            support: true,
            bookings: true,
            nannies: true,
            clients: true,
          }
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating admin profile:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update admin profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // Create new admin profile as super admin
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          id: userId,
          department: 'Management',
          admin_level: 'super_admin',
          permissions: {
            payments: true,
            analytics: true,
            professional_development: true,
            user_management: true,
            verification: true,
            support: true,
            bookings: true,
            nannies: true,
            clients: true,
          }
        })

      if (adminError) {
        console.error('Error creating admin profile:', adminError)
        return new Response(
          JSON.stringify({ error: 'Failed to create admin profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Super admin setup completed successfully',
        user_id: userId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in setup-super-admin function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
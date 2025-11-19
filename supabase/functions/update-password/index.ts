import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdatePasswordRequest {
  email: string;
  newPassword: string;
  resetToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword, resetToken }: UpdatePasswordRequest = await req.json();
    console.log(`Updating password for ${email}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the user first
    const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(
        JSON.stringify({ error: "Failed to find user" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const user = users?.users?.find(u => u.email === email);
    
    if (!user) {
      console.log('User not found for email:', email);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update the user's password using admin API
    const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password: " + updateError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Password updated successfully for user:', user.id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password updated successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in update-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
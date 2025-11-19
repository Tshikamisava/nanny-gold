import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  email: string;
  otp: string;
  purpose: 'signup' | 'password_reset';
  userData?: {
    first_name: string;
    last_name: string;
    phone?: string;
    user_type: string;
    password?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, purpose, userData }: VerifyOtpRequest = await req.json();
    console.log(`Verifying OTP for ${email}, purpose: ${purpose}, code: ${otp}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, let's check all OTPs for this email and purpose for debugging
    const { data: allOtps } = await supabaseClient
      .from('temp_otp_codes')
      .select('*')
      .eq('identifier', email)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('All recent OTPs for this email:', allOtps);

    // Verify OTP - use maybeSingle() to avoid errors when no record is found
    const { data: otpRecord, error: otpError } = await supabaseClient
      .from('temp_otp_codes')
      .select('*')
      .eq('identifier', email)
      .eq('code', otp)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    console.log('OTP query result:', { otpRecord, otpError });
    console.log('Current time:', new Date().toISOString());

    if (otpError) {
      console.error('OTP query error:', otpError);
      return new Response(
        JSON.stringify({ error: "Database error while verifying OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!otpRecord) {
      console.log('No valid OTP found for:', { email, otp, purpose });
      
      // Check if there's a matching OTP that's been used or expired
      const { data: usedOrExpiredOtp } = await supabaseClient
        .from('temp_otp_codes')
        .select('*')
        .eq('identifier', email)
        .eq('code', otp)
        .eq('purpose', purpose)
        .maybeSingle();

      if (usedOrExpiredOtp) {
        if (usedOrExpiredOtp.used) {
          console.log('OTP has already been used');
          return new Response(
            JSON.stringify({ error: "This code has already been used. Please request a new one." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        } else if (new Date(usedOrExpiredOtp.expires_at) < new Date()) {
          console.log('OTP has expired');
          return new Response(
            JSON.stringify({ error: "This code has expired. Please request a new one." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Invalid verification code. Please check and try again." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await supabaseClient
      .from('temp_otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error marking OTP as used:', updateError);
      // Continue anyway, as the main verification was successful
    }

    if (purpose === 'signup') {
      // Validate password is provided
      if (!userData?.password || userData.password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Create user account with provided password
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          first_name: userData?.first_name,
          last_name: userData?.last_name,
          phone: userData?.phone,
          user_type: userData?.user_type || 'nanny',
          verified_via_otp: true
        }
      });

      if (authError) {
        console.error('User creation error:', authError);
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate session tokens
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (sessionError) {
        console.error('Session generation error:', sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Store referral code in clients table if provided
      if (userData.referral_code && authData?.user?.id) {
        const { error: clientUpdateError } = await supabaseClient
          .from('clients')
          .update({ 
            referral_code_used: userData.referral_code.toUpperCase() 
          })
          .eq('id', authData.user.id);
          
        if (clientUpdateError) {
          console.error('Error storing referral code:', clientUpdateError);
        } else {
          console.log('✅ Referral code stored:', userData.referral_code);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Account created successfully",
          user: authData.user,
          session: {
            access_token: sessionData.properties.access_token,
            refresh_token: sessionData.properties.refresh_token
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else if (purpose === 'password_reset') {
      console.log('Processing password reset for:', email);
      
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

      // Generate password reset session  
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });

      if (sessionError) {
        console.error('Session generation error:', sessionError);
        return new Response(
          JSON.stringify({ error: "Failed to generate reset session" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log('Password reset session generated successfully');
      
      // Return a reset token that can be used to update password
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP verified successfully",
          user: user,
          reset_token: sessionData.properties?.access_token, // Special token for password reset
          session: {
            access_token: sessionData.properties?.access_token,
            refresh_token: sessionData.properties?.refresh_token
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-email-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
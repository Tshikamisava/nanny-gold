import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    referral_code?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Log request info for debugging
  console.log(`[DEBUG] Received ${req.method} request to verify-email-otp`);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(err => {
      console.error("[ERROR] Failed to parse request body:", err);
      return null;
    });

    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, otp, purpose, userData }: VerifyOtpRequest = body;
    console.log(`[DEBUG] Verifying OTP for ${email}, purpose: ${purpose}`);

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and verification code are required" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOtp = String(otp).trim();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ERROR] Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify OTP
    const { data: otpRecord, error: otpError } = await supabaseClient
      .from('temp_otp_codes')
      .select('*')
      .eq('identifier', normalizedEmail)
      .eq('code', normalizedOtp)
      .eq('purpose', purpose || 'signup')
      .eq('used', false)
      .gt('expires_at', 'now()')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('[ERROR] OTP query error:', otpError);
      return new Response(
        JSON.stringify({ success: false, error: "Database error while verifying OTP" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!otpRecord) {
      console.log('[DEBUG] No valid OTP found for:', email);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired verification code. Please request a new one." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as used
    await supabaseClient
      .from('temp_otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id);

    if (purpose === 'signup') {
      if (!userData?.password || userData.password.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: "Password must be at least 8 characters" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`[DEBUG] Creating user account for ${email}`);
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          first_name: userData?.first_name,
          last_name: userData?.last_name,
          phone: userData?.phone,
          user_type: userData?.user_type || 'client',
          verified_via_otp: true
        }
      });

      if (authError) {
        console.error('[ERROR] User creation error:', authError);
        let errorMsg = authError.message;
        if (errorMsg.includes('already exists')) {
          errorMsg = "An account with this email already exists";
        }
        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`[DEBUG] Generating session for ${email}`);
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (sessionError || !sessionData?.properties) {
        console.error('[ERROR] Session generation error:', sessionError);
        return new Response(
          JSON.stringify({ success: false, error: "Account created but failed to sign in automatically. Please log in manually." }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Store referral if provided
      if (userData?.referral_code && authData?.user?.id) {
        const referralCode = userData.referral_code.toUpperCase();
        
        // Update clients table if it exists
        await supabaseClient
          .from('clients')
          .update({ referral_code_used: referralCode })
          .eq('id', authData.user.id);

        // Look up the referrer in referral_participants
        const { data: referrer } = await supabaseClient
          .from('referral_participants')
          .select('id, user_id, role')
          .eq('referral_code', referralCode)
          .eq('active', true)
          .maybeSingle();

        // Create referral_logs entry linking referrer to new user
        if (referrer) {
          await supabaseClient
            .from('referral_logs')
            .insert({
              referrer_id: referrer.id,
              referred_user_id: authData.user.id,
              status: 'Pending',
              notes: `Auto-created on signup via referral code ${referralCode}`
            });
          console.log(`[INFO] Referral log created: referrer=${referrer.id}, referred=${authData.user.id}`);
        }
      }

      // Auto-enroll new user in referral program with a unique code
      if (authData?.user?.id) {
        const userRole = (userData?.user_type === 'nanny') ? 'Nanny' : 'Client';
        const autoCode = authData.user.id.substring(0, 6).toUpperCase()
          + Math.random().toString(36).substring(2, 5).toUpperCase();

        await supabaseClient
          .from('referral_participants')
          .insert({
            user_id: authData.user.id,
            role: userRole,
            referral_code: autoCode,
            active: true,
            notes: 'Auto-enrolled on signup'
          });
        console.log(`[INFO] Auto-enrolled user ${authData.user.id} in referral program with code ${autoCode}`);
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
      // Find existing user
      const { data: usersData, error: userError } = await supabaseClient.auth.admin.listUsers();
      const user = usersData?.users.find((u: any) => u.email === email);

      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: "No account found with this email" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });

      if (sessionError) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to generate reset link" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: user,
          session: {
            access_token: sessionData.properties?.access_token,
            refresh_token: sessionData.properties?.refresh_token
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP verified" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[CRITICAL ERROR] Error in verify-email-otp function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
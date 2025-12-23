import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
  isLogin?: boolean;
  firstName?: string;
  lastName?: string;
  userType?: string;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, otp, isLogin, firstName, lastName, userType }: VerifyOtpRequest = await req.json();

    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ success: false, error: "Missing phone or OTP" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean phone number (remove non-digits) - MUST match send-sms-otp formatting exactly
    let cleanPhone = phoneNumber.replace(/\D/g, '');

    // Handle different input formats - EXACTLY like send-sms-otp
    if (cleanPhone.startsWith('0')) {
      // Convert 0xxxxxxxxx to 27xxxxxxxxx
      cleanPhone = '27' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('27')) {
      // Already has country code, keep as is
    } else if (cleanPhone.length === 9) {
      // Assume it's a local number, add country code
      cleanPhone = '27' + cleanPhone;
    }

    // Must be exactly 11 digits total (27 + 9 local digits)
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('27')) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid South African phone number format. Use +27xxxxxxxxx format (currently ${cleanPhone.length} digits)`
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Use the full formatted phone (27xxxxxxxxx) - EXACTLY like send-sms-otp
    const formattedPhone = cleanPhone;

    // Validate OTP from temp_otp_codes table
    const { data, error } = await supabase
      .from('temp_otp_codes')
      .select('code')
      .eq('identifier', formattedPhone)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ success: false, error: "OTP not found or expired" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Compare OTP codes
    if (data.code === otp) {
      // Mark OTP as used
      await supabase
        .from('temp_otp_codes')
        .update({ used: true })
        .eq('identifier', formattedPhone)
        .eq('code', otp);

      if (isLogin) {
        // For login: find existing user by phone and create session
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('phone', formattedPhone)
          .single();

        if (profileError || !profile) {
          return new Response(JSON.stringify({
            success: false,
            error: "No account found with this phone number"
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        // Create session for existing user
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: profile.email,
        });

        if (sessionError) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to create session"
          }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          user: { id: profile.id },
          session: sessionData.properties?.session || sessionData.properties,
          isLogin: true
        }), {
          status: 200,
          headers: corsHeaders,
        });
      } else {
        // Create new user account with unique email
        const timestamp = Date.now();
        const tempEmail = `${formattedPhone}-${timestamp}@temp-phone-auth.local`;

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: tempEmail,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            user_type: userType || 'client',
            phone: '+' + formattedPhone, // Add + sign for database constraint
            verified_via_sms: true
          }
        });

        if (authError) {
          console.error('User creation error:', authError);
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to create account: " + authError.message
          }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        if (!authData?.user?.id) {
          console.error('User creation returned no user data');
          return new Response(JSON.stringify({
            success: false,
            error: "Account creation failed - no user data returned"
          }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        console.log('User created successfully:', authData.user.id);

        // Generate session tokens for the new user
        const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: tempEmail,
        });

        if (tokenError) {
          console.error('Token generation error:', tokenError);
          return new Response(JSON.stringify({
            success: false,
            error: "Account created but failed to generate tokens: " + tokenError.message
          }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        // Store referral code in clients table if provided
        if (userData?.referral_code && authData?.user?.id) {
          const { error: clientUpdateError } = await supabase
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

        // Return user data with properly formatted session info
        return new Response(JSON.stringify({
          success: true,
          user: authData.user,
          session: {
            access_token: tokenData.properties.access_token,
            refresh_token: tokenData.properties.refresh_token
          },
          isSignup: true,
          userType: userType || 'client',
          phone: '+' + formattedPhone,
          message: "Account created and session established successfully"
        }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid OTP" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Critical error in verify-sms-otp function:', err);
    console.error('Error stack:', err.stack);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error: " + err.message
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

serve(handler);
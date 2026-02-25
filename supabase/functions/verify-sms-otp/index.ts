import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
  isLogin?: boolean;
  firstName?: string;
  lastName?: string;
  userType?: string;
  userData?: {
    referral_code?: string;
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { phoneNumber, otp, isLogin, firstName, lastName, userType, userData }: VerifyOtpRequest = await req.json();

    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ success: false, error: "Missing phone or OTP" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clean phone number (remove non-digits)
    let cleanPhone = phoneNumber.replace(/\D/g, '');

    if (cleanPhone.startsWith('0')) {
      cleanPhone = '27' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9) {
      cleanPhone = '27' + cleanPhone;
    }

    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('27')) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid South African phone number format (+27)`
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const formattedPhone = cleanPhone;
    // Validate OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('temp_otp_codes')
      .select('code')
      .eq('identifier', formattedPhone)
      .eq('used', false)
      .gt('expires_at', 'now()')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ success: false, error: "OTP not found or expired" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (otpRecord.code === otp) {
      await supabase
        .from('temp_otp_codes')
        .update({ used: true })
        .eq('identifier', formattedPhone)
        .eq('code', otp);

      if (isLogin) {
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
            status: 200,
            headers: corsHeaders,
          });
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: profile.email,
        });

        if (sessionError) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to create session"
          }), {
            status: 200,
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
            phone: '+' + formattedPhone,
            verified_via_sms: true
          }
        });

        if (authError) {
          let msg = authError.message;
          if (msg.includes('already exists')) msg = "An account with this phone number already exists";
          return new Response(JSON.stringify({ success: false, error: msg }), {
            status: 200,
            headers: corsHeaders,
          });
        }

        const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: tempEmail,
        });

        if (tokenError) {
          return new Response(JSON.stringify({
            success: false,
            error: "Account created but failed to generate session"
          }), {
            status: 200,
            headers: corsHeaders,
          });
        }

        if (userData?.referral_code && authData?.user?.id) {
          const referralCode = userData.referral_code.toUpperCase();
          
          await supabase
            .from('clients')
            .update({ referral_code_used: referralCode })
            .eq('id', authData.user.id);

          // Look up the referrer in referral_participants
          const { data: referrer } = await supabase
            .from('referral_participants')
            .select('id, user_id, role')
            .eq('referral_code', referralCode)
            .eq('active', true)
            .maybeSingle();

          // Create referral_logs entry linking referrer to new user
          if (referrer) {
            await supabase
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

          await supabase
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

        return new Response(JSON.stringify({
          success: true,
          user: authData.user,
          session: {
            access_token: tokenData.properties.access_token,
            refresh_token: tokenData.properties.refresh_token
          },
          isSignup: true
        }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid OTP" }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error('Critical error in verify-sms-otp function:', err);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error: " + err.message
    }), {
      status: 200,
      headers: corsHeaders,
    });
  }
};

Deno.serve(handler);
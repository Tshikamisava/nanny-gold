import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsOtpRequest {
  phoneNumber: string;
  firstName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, firstName }: SmsOtpRequest = await req.json();

    // Strict South African phone number validation
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean phone number (remove non-digits)
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Handle different input formats
    if (cleanPhone.startsWith('0')) {
      // Convert 0xxxxxxxxx to 27xxxxxxxxx
      cleanPhone = '27' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('27')) {
      // Already has country code, keep as is
      cleanPhone = cleanPhone;
    } else if (cleanPhone.length === 9) {
      // Assume it's a local number, add country code
      cleanPhone = '27' + cleanPhone;
    }

    // Must be exactly 11 digits total (27 + 9 local digits)
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('27')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid South African phone number format. Use +27xxxxxxxxx format (currently ${cleanPhone.length} digits)` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract local number (without 27 prefix) for final validation
    const localNumber = cleanPhone.substring(2);
    if (localNumber.length !== 9) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid local number length. Must be exactly 9 digits after +27 (currently ${localNumber.length})` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use the full formatted phone (27xxxxxxxxx)
    const formattedPhone = cleanPhone;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Get SMSPortal credentials - they should be configured
    const smsPortalClientId = Deno.env.get('SMSPORTAL_CLIENT_ID');
    const smsPortalApiSecret = Deno.env.get('SMSPORTAL_API_SECRET');
    
    if (!smsPortalClientId || !smsPortalApiSecret) {
      console.error('SMSPortal credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Store OTP in database with SMS delivery method (2-minute expiry)
    const { error: otpError } = await supabase
      .from('temp_otp_codes')
      .insert({
        identifier: formattedPhone,
        code: otp, // Always use real OTP
        purpose: 'phone_auth',
        delivery_method: 'sms' // SMS OTPs get 2 minutes via trigger
      });

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate OTP' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send SMS via SMSPortal API
    const credentials = btoa(`${smsPortalClientId}:${smsPortalApiSecret}`);
    const message = `Your NannyGold verification code is: ${otp}. This code expires in 2 minutes.`;

    const smsResponse = await fetch('https://rest.smsportal.com/bulkmessages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        messages: [
          {
            content: message,
            destination: formattedPhone
          }
        ]
      }),
    });

    const smsResult = await smsResponse.json();

    if (!smsResponse.ok) {
      console.error('SMSPortal API error:', smsResult);
      
      // In production, return proper error instead of fallback
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send SMS. Please try again or contact support.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('SMS sent successfully:', smsResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-sms-otp function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);
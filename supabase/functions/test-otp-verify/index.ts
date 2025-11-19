import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, purpose } = await req.json();
    console.log(`Testing OTP verification for ${email}, purpose: ${purpose}, code: ${otp}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check all OTPs for this email and purpose
    const { data: allOtps, error: queryError } = await supabaseClient
      .from('temp_otp_codes')
      .select('*')
      .eq('identifier', email)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ error: "Database query failed", details: queryError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('All OTPs found:', allOtps);

    // Check for exact match
    const exactMatch = allOtps?.find(otp_record => otp_record.code === otp);
    
    if (exactMatch) {
      console.log('Exact OTP match found:', exactMatch);
      
      const status = {
        found: true,
        used: exactMatch.used,
        expired: new Date(exactMatch.expires_at) < new Date(),
        code: exactMatch.code,
        created_at: exactMatch.created_at,
        expires_at: exactMatch.expires_at
      };

      return new Response(
        JSON.stringify({ 
          success: true, 
          otp_status: status,
          all_otps: allOtps,
          current_time: new Date().toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      console.log('No matching OTP found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No matching OTP found",
          all_otps: allOtps,
          searched_code: otp
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error("Error in test-otp-verify function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
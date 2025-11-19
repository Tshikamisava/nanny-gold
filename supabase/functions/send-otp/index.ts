import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OtpRequest {
  email: string;
  name: string;
  phone?: string;
  purpose?: 'signup' | 'password_reset';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, phone, purpose = 'signup' }: OtpRequest = await req.json();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check rate limiting (5 requests per hour)
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient
      .rpc('check_otp_rate_limit', { identifier_param: email });

    if (rateLimitError || !rateLimitCheck) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Too many requests. Please wait before requesting another code." 
      }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Optional phone validation (South African format)
    const normalizedPhone = (phone ?? '').replace(/\s/g, '');
    const phoneRegex = /^(\+27|0)[0-9]{9}$/;
    if (normalizedPhone && !phoneRegex.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use South African format (+27 or 0)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clean up any expired OTPs first  
    await supabaseClient.rpc('cleanup_expired_security_data');

    // Store new OTP with appropriate expiry based on delivery method
    const { error: otpError } = await supabaseClient
      .from('temp_otp_codes')
      .insert({
        identifier: email,
        code: otp,
        purpose: purpose,
        delivery_method: 'email' // Email OTPs get 10 minutes
      });

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log security event
    await supabaseClient.rpc('log_security_event', {
      p_event_type: 'otp_sent',
      p_event_details: { 
        email, 
        purpose,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    const subject = purpose === 'password_reset' 
      ? "Reset Your Password - NannyGold"
      : "Verify Your Email - NannyGold";

    const emailContent = purpose === 'password_reset' 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Reset Your Password</h1>
          <p>Hi ${name},</p>
          <p>You requested to reset your password. Please use the verification code below:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #1f2937; font-size: 32px; letter-spacing: 4px; margin: 0;">${otp}</h2>
          </div>
          <p>This code will expire in 10 minutes for security purposes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br>The NannyGold Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Welcome to NannyGold, ${name}!</h1>
          <p>Thank you for signing up. Please use the verification code below to complete your registration:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #1f2937; font-size: 32px; letter-spacing: 4px; margin: 0;">${otp}</h2>
          </div>
          <p>This code will expire in 10 minutes for security purposes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <br>
          <p>Best regards,<br>The NannyGold Team</p>
        </div>
      `;
    
    const emailResponse = await resend.emails.send({
      from: "NannyGold <donotreply@nannygold.co.za>",
      to: [email],
      subject: subject,
      html: emailContent,
    });

    console.log("OTP email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        otp, // Remove this in production - only for demo
        message: "OTP sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
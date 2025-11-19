import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for secure writes
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { reference } = await req.json();

    // Verify payment with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    const transaction = paystackData.data;
    const authorization = transaction.authorization;
    const userId = transaction.metadata.user_id;

    // Save payment method to database
    const { error } = await supabaseClient
      .from('client_payment_methods')
      .insert({
        client_id: userId,
        paystack_authorization_code: authorization.authorization_code,
        card_type: authorization.card_type,
        last_four: authorization.last4,
        exp_month: authorization.exp_month,
        exp_year: authorization.exp_year,
        bank: authorization.bank,
      });

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment method added successfully',
      card_info: {
        card_type: authorization.card_type,
        last_four: authorization.last4,
        exp_month: authorization.exp_month,
        exp_year: authorization.exp_year,
        bank: authorization.bank
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error saving payment method:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { authorization_id } = await req.json();

    console.log(`💰 Capturing payment for authorization ${authorization_id}`);

    // Get authorization record
    const { data: authRecord, error: fetchError } = await supabaseClient
      .from('payment_authorizations')
      .select('*')
      .eq('id', authorization_id)
      .eq('status', 'authorized')
      .single();

    if (fetchError || !authRecord) {
      console.log(`❌ Authorization not found or not in authorized status:`, fetchError);
      return new Response(
        JSON.stringify({ error: 'Authorization not found or already processed' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // For Paystack, since we already charged when authorizing, we just need to verify the transaction
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${authRecord.paystack_reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      console.log(`❌ Paystack verification failed:`, paystackData.message);
      
      // Update authorization as failed
      await supabaseClient
        .from('payment_authorizations')
        .update({
          status: 'failed',
          failure_reason: paystackData.message || 'Transaction verification failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', authorization_id);

      return new Response(
        JSON.stringify({ error: paystackData.message || 'Transaction verification failed' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Update authorization as captured
    const { error: updateError } = await supabaseClient
      .from('payment_authorizations')
      .update({
        status: 'captured',
        capture_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', authorization_id);

    if (updateError) {
      console.log(`❌ Database update error:`, updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update authorization status' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Update booking status if needed
    if (authRecord.booking_id) {
      await supabaseClient
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', authRecord.booking_id);
    }

    console.log(`✅ Payment captured successfully: ${authorization_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        authorization_id: authorization_id,
        amount: authRecord.amount,
        captured_at: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Capture error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
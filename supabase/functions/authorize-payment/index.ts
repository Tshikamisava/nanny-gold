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

    const { booking_id, user_id, amount } = await req.json();

    console.log(`💳 Authorizing payment for booking ${booking_id}, user ${user_id}, amount ${amount}`);

    // Get user's email and payment method from previous successful payments
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    if (userError || !userProfile?.email) {
      console.log(`❌ Could not find user email for ${user_id}:`, userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get user's payment method from previous successful payments
    const { data: lastPayment } = await supabaseClient
      .from('payment_authorizations')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'captured')
      .order('capture_date', { ascending: false })
      .limit(1)
      .single();

    if (!lastPayment?.authorization_code) {
      console.log(`❌ No previous payment method found for user ${user_id}`);
      return new Response(
        JSON.stringify({ error: 'No payment method on file. User needs to make initial payment.' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create authorization using Paystack's charge authorization API
    const paystackResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_code: lastPayment.authorization_code,
        email: userProfile.email,
        amount: amount, // Amount in cents for ZAR
        currency: 'ZAR',
        reference: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          booking_id,
          user_id,
          type: 'monthly_authorization'
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.log(`❌ Paystack authorization failed:`, paystackData.message);
      return new Response(
        JSON.stringify({ error: paystackData.message }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Store authorization in database
    const { data: authRecord, error: dbError } = await supabaseClient
      .from('payment_authorizations')
      .insert({
        user_id,
        booking_id,
        amount,
        authorization_code: lastPayment.authorization_code,
        authorization_date: new Date().toISOString(),
        status: 'authorized',
        paystack_reference: paystackData.data.reference,
        paystack_transaction_id: paystackData.data.id,
      })
      .select()
      .single();

    if (dbError) {
      console.log(`❌ Database error:`, dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to store authorization' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`✅ Payment authorized successfully: ${authRecord.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        authorization_id: authRecord.id,
        amount: amount,
        reference: paystackData.data.reference
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Authorization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      console.log("❌ User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const user = userData.user;
    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: 'User email not found' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { amount, booking_id, is_recurring = false, nannyName } = await req.json();

    console.log(`🧪 TEST MODE - Initializing Paystack payment - Amount: ${amount}, User: ${user.email}, Recurring: ${is_recurring}`);

    // Generate unique reference
    const reference = `test_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize payment with Paystack TEST API
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_TEST_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amount, // Amount in cents
        currency: 'ZAR', // South African Rand
        reference: reference,
        callback_url: `${req.headers.get("origin")}/booking-confirmation?reference=${reference}&test=true`,
        metadata: {
          user_id: user.id,
          booking_id: booking_id,
          is_recurring: is_recurring,
          nanny_name: nannyName || 'Test Nanny Service',
          test_mode: true
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.log(`❌ TEST MODE - Paystack initialization failed:`, paystackData.message);
      return new Response(
        JSON.stringify({ error: paystackData.message }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`✅ TEST MODE - Payment initialized successfully: ${reference}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: reference,
        test_mode: true
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ TEST MODE - Payment initialization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
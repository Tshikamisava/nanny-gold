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

    const { reference } = await req.json();

    console.log(`🔍 Verifying Paystack payment: ${reference}`);

    // Verify payment with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.log(`❌ Paystack verification failed:`, paystackData.message);
      return new Response(
        JSON.stringify({ error: paystackData.message }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const transaction = paystackData.data;

    if (transaction.status !== 'success') {
      console.log(`❌ Transaction was not successful: ${transaction.status}`);
      return new Response(
        JSON.stringify({ error: `Transaction ${transaction.status}` }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Extract metadata
    const metadata = transaction.metadata || {};
    const user_id = metadata.user_id;
    const booking_id = metadata.booking_id;
    const is_recurring = metadata.is_recurring;

    console.log(`✅ Payment verified - Amount: ${transaction.amount}, User: ${user_id}, Recurring: ${is_recurring}`);

    // Store authorization details for future use (recurring payments)
    if (is_recurring && transaction.authorization && transaction.authorization.authorization_code) {
      const { error: authError } = await supabaseClient
        .from('payment_authorizations')
        .insert({
          user_id: user_id,
          booking_id: booking_id,
          amount: transaction.amount,
          authorization_code: transaction.authorization.authorization_code,
          authorization_date: new Date().toISOString(),
          capture_date: new Date().toISOString(), // For the initial payment, auth and capture happen together
          status: 'captured',
          paystack_reference: reference,
          paystack_transaction_id: transaction.id,
        });

      if (authError) {
        console.log(`⚠️ Failed to store authorization:`, authError);
        // Don't fail verification, just log the error
      } else {
        console.log(`✅ Authorization stored for future recurring payments`);
      }
    }

    // Update booking status if booking_id is provided
    if (booking_id) {
      const { error: bookingError } = await supabaseClient
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id);

      if (bookingError) {
        console.log(`⚠️ Failed to update booking status:`, bookingError);
        // Don't fail verification, just log the error
      } else {
        console.log(`✅ Booking ${booking_id} confirmed`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transaction_id: transaction.id,
        amount: transaction.amount,
        reference: reference,
        authorization_code: transaction.authorization?.authorization_code,
        is_recurring: is_recurring
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
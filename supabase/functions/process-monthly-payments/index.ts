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

    const { action } = await req.json(); // 'authorize' or 'capture'
    const currentDate = new Date();
    const currentDay = currentDate.getDate();

    console.log(`🔄 Processing monthly payments - Action: ${action}, Date: ${currentDate.toISOString()}`);

    if (action === 'authorize') {
      // Process authorizations (run on 25th of each month)
      if (currentDay !== 25) {
        console.log(`⚠️ Authorization should only run on 25th, current day: ${currentDay}`);
      }

      // Get all active payment schedules that need authorization
      const { data: schedules, error: fetchError } = await supabaseClient
        .from('payment_schedules')
        .select(`
          *,
          bookings!inner(
            id,
            status,
            client_id
          )
        `)
        .eq('is_active', true)
        .lte('next_authorization_date', currentDate.toISOString())
        .eq('bookings.status', 'confirmed');

      if (fetchError) {
        console.log(`❌ Error fetching payment schedules:`, fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch payment schedules' }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }

      console.log(`📋 Found ${schedules?.length || 0} schedules to authorize`);

      const results = [];
      for (const schedule of schedules || []) {
        try {
          // Call authorize-payment function
          const authResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/authorize-payment`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              booking_id: schedule.booking_id,
              user_id: schedule.user_id,
              amount: schedule.monthly_amount
            }),
          });

          const authResult = await authResponse.json();

          if (authResponse.ok) {
            // Update schedule with successful authorization
            await supabaseClient
              .from('payment_schedules')
              .update({
                last_authorization_date: currentDate.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', schedule.id);

            results.push({
              schedule_id: schedule.id,
              user_id: schedule.user_id,
              status: 'authorized',
              authorization_id: authResult.authorization_id
            });

            console.log(`✅ Authorized payment for schedule ${schedule.id}`);
          } else {
            results.push({
              schedule_id: schedule.id,
              user_id: schedule.user_id,
              status: 'failed',
              error: authResult.error
            });

            console.log(`❌ Failed to authorize payment for schedule ${schedule.id}: ${authResult.error}`);
          }
        } catch (error) {
          console.log(`❌ Error processing schedule ${schedule.id}:`, error);
          results.push({
            schedule_id: schedule.id,
            user_id: schedule.user_id,
            status: 'error',
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'authorize',
          processed: results.length,
          results 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else if (action === 'capture') {
      // Process captures (run on 1st of each month)
      if (currentDay !== 1) {
        console.log(`⚠️ Capture should only run on 1st, current day: ${currentDay}`);
      }

      // Get all authorized payments that need to be captured
      const { data: authorizations, error: fetchError } = await supabaseClient
        .from('payment_authorizations')
        .select('*')
        .eq('status', 'authorized')
        .lte('authorization_date', new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()); // At least 7 days old

      if (fetchError) {
        console.log(`❌ Error fetching authorizations:`, fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch authorizations' }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }

      console.log(`📋 Found ${authorizations?.length || 0} authorizations to capture`);

      const results = [];
      for (const auth of authorizations || []) {
        try {
          // Call capture-payment function
          const captureResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/capture-payment`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              authorization_id: auth.id
            }),
          });

          const captureResult = await captureResponse.json();

          if (captureResponse.ok) {
            // Update payment schedule with successful capture
            await supabaseClient
              .from('payment_schedules')
              .update({
                last_capture_date: currentDate.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('booking_id', auth.booking_id);

            results.push({
              authorization_id: auth.id,
              user_id: auth.user_id,
              status: 'captured',
              amount: auth.amount
            });

            console.log(`✅ Captured payment for authorization ${auth.id}`);

            // Generate nanny payment advice after successful capture
            try {
              console.log(`💳 Generating payment advice for booking ${auth.booking_id}`);
              
              // Get booking details
              const { data: booking } = await supabaseClient
                .from('bookings')
                .select('nanny_id, start_date')
                .eq('id', auth.booking_id)
                .single();

              if (!booking) {
                console.log(`⚠️ Booking ${auth.booking_id} not found for payment advice`);
                continue;
              }

              // Get financial details
              const { data: financials } = await supabaseClient
                .from('booking_financials')
                .select('nanny_earnings, admin_total_revenue, commission_amount')
                .eq('booking_id', auth.booking_id)
                .single();

              if (!financials) {
                console.log(`⚠️ Financials not found for booking ${auth.booking_id}`);
                continue;
              }

              // Calculate period (current month)
              const now = new Date();
              const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

              // Generate payment advice using existing RPC function
              const { data: adviceResult, error: adviceError } = await supabaseClient.rpc(
                'generate_nanny_payment_advice',
                {
                  p_nanny_id: booking.nanny_id,
                  p_base_amount: financials.nanny_earnings,
                  p_period_start: periodStart.toISOString().split('T')[0],
                  p_period_end: periodEnd.toISOString().split('T')[0],
                  p_booking_id: auth.booking_id
                }
              );

              if (adviceError) {
                console.log(`❌ Failed to generate payment advice:`, adviceError);
              } else {
                console.log(`✅ Payment advice ${adviceResult} generated for nanny ${booking.nanny_id}`);
                
                // Send notification to nanny
                await supabaseClient.from('notifications').insert({
                  user_id: booking.nanny_id,
                  title: 'Payment Advice Generated',
                  message: `Your payment advice for the period ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()} is ready. Amount: R${financials.nanny_earnings.toFixed(2)}`,
                  type: 'payment_advice_generated',
                  data: {
                    payment_advice_id: adviceResult,
                    booking_id: auth.booking_id,
                    amount: financials.nanny_earnings,
                    period_start: periodStart.toISOString(),
                    period_end: periodEnd.toISOString()
                  }
                });
              }
            } catch (adviceGenError) {
              console.log(`❌ Error generating payment advice:`, adviceGenError);
            }

          } else {
            results.push({
              authorization_id: auth.id,
              user_id: auth.user_id,
              status: 'failed',
              error: captureResult.error
            });

            console.log(`❌ Failed to capture payment for authorization ${auth.id}: ${captureResult.error}`);
          }
        } catch (error) {
          console.log(`❌ Error processing authorization ${auth.id}:`, error);
          results.push({
            authorization_id: auth.id,
            user_id: auth.user_id,
            status: 'error',
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'capture',
          processed: results.length,
          results 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "authorize" or "capture"' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

  } catch (error) {
    console.error('❌ Monthly payment processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
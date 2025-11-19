import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { booking_id, client_id } = await req.json();

    console.log('🎯 Tracking referral reward for:', { booking_id, client_id });

    // Get client's referral code and placement fee
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('referral_code_used, placement_fee_original')
      .eq('id', client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ success: false, message: 'Client not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!client?.referral_code_used) {
      console.log('No referral code used by this client');
      return new Response(
        JSON.stringify({ success: false, message: 'No referral code used' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the referrer
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from('referral_participants')
      .select('user_id, is_influencer, commission_percentage')
      .eq('referral_code', client.referral_code_used)
      .eq('active', true)
      .single();

    if (referrerError || !referrer) {
      console.error('Error fetching referrer:', referrerError);
      return new Response(
        JSON.stringify({ success: false, message: 'Referrer not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Calculate reward (20% of original placement fee)
    const reward_amount = (client.placement_fee_original || 0) * 0.20;

    console.log('💰 Calculating reward:', {
      original_fee: client.placement_fee_original,
      reward_amount,
      commission_percentage: 20
    });

    // Create referral log
    const { error: logError } = await supabaseAdmin
      .from('referral_logs')
      .insert({
        referrer_id: referrer.user_id,
        referred_user_id: client_id,
        placement_fee: client.placement_fee_original,
        reward_percentage: 20,
        reward_amount: reward_amount,
        status: 'Pending',
        referrer_type: referrer.is_influencer ? 'influencer' : 'client',
        discount_applied: (client.placement_fee_original || 0) * 0.20,
        booking_id: booking_id
      });

    if (logError) {
      console.error('Error creating referral log:', logError);
      throw logError;
    }

    console.log('✅ Referral log created');

    // Update or create reward balance
    const { data: existingBalance } = await supabaseAdmin
      .from('reward_balances')
      .select('*')
      .eq('user_id', referrer.user_id)
      .single();

    if (existingBalance) {
      const { error: updateError } = await supabaseAdmin
        .from('reward_balances')
        .update({
          total_earned: existingBalance.total_earned + reward_amount,
          available_balance: existingBalance.available_balance + reward_amount,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', referrer.user_id);

      if (updateError) {
        console.error('Error updating reward balance:', updateError);
        throw updateError;
      }

      console.log('✅ Reward balance updated');
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('reward_balances')
        .insert({
          user_id: referrer.user_id,
          total_earned: reward_amount,
          available_balance: reward_amount,
          total_redeemed: 0
        });

      if (insertError) {
        console.error('Error creating reward balance:', insertError);
        throw insertError;
      }

      console.log('✅ Reward balance created');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reward_amount,
        message: 'Referral reward tracked successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error tracking referral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

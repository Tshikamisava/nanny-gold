import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      console.error('Auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    if (!user) {
      console.error('No user found in session');
      throw new Error('User not authenticated. Please log in again.');
    }
    
    console.log('Authenticated user:', user.id);

    // Parse request body
    const { bookingId, invoiceId, paymentReference, proofOfPaymentUrl } = await req.json();
    
    console.log('📥 EFT payment request:', { bookingId, invoiceId, paymentReference });
    
    // Determine booking ID from either direct bookingId or via invoiceId
    let finalBookingId = bookingId;
    let clientId = user.id;
    
    // If no bookingId but invoiceId provided, lookup booking via invoice
    if (!finalBookingId && invoiceId) {
      console.log('📄 Looking up booking from invoice:', invoiceId);
      const { data: invoiceData, error: invoiceError } = await supabaseClient
        .from('invoices')
        .select('booking_id, client_id')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError || !invoiceData) {
        console.error('❌ Invoice not found:', invoiceId, invoiceError);
        throw new Error('Invoice not found. Please contact support.');
      }
      
      finalBookingId = invoiceData.booking_id;
      clientId = invoiceData.client_id;
      console.log('✅ Found booking via invoice:', finalBookingId);
    }
    
    if (!finalBookingId) {
      console.error('❌ No booking ID provided or found');
      throw new Error('Booking or invoice ID required');
    }

    console.log('Processing EFT booking:', { finalBookingId, paymentReference });

    // Validate booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', finalBookingId)
      .eq('client_id', clientId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', finalBookingId, bookingError);
      throw new Error('Booking not found. Please try again or contact support.');
    }

    // Update booking with EFT details - keep as pending for admin verification
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'pending',
        notes: `EFT Payment - Ref: ${paymentReference}. Awaiting admin verification.`,
        updated_at: new Date().toISOString()
      })
      .eq('id', finalBookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }

    // Create or update payment proof record with proper booking_id
    if (proofOfPaymentUrl) {
      const { error: proofError } = await supabaseClient
        .from('payment_proofs')
        .upsert({
          booking_id: finalBookingId,
          invoice_id: invoiceId,
          client_id: clientId,
          proof_url: proofOfPaymentUrl,
          payment_reference: paymentReference,
          payment_method: 'eft',
          verification_status: 'pending',
          amount: booking.total_monthly_cost
        }, {
          onConflict: 'booking_id,client_id'
        });

      if (proofError) {
        console.error('Error storing payment proof:', proofError);
        // Don't throw - booking is already created
      }
    }

    // Track referral reward if applicable
    try {
      const { error: rewardError } = await supabaseClient.functions.invoke('track-referral-reward', {
        body: { booking_id: finalBookingId, client_id: clientId }
      });
      if (rewardError) {
        console.error('⚠️ Referral reward tracking failed (non-critical):', rewardError);
      } else {
        console.log('✅ Referral reward tracking initiated');
      }
    } catch (rewardError) {
      console.error('⚠️ Referral reward tracking error (non-critical):', rewardError);
    }

    // Create notification for client
    await supabaseClient.from('notifications').insert({
      user_id: clientId,
      title: 'EFT Payment Submitted',
      message: 'Your EFT payment proof has been submitted and is awaiting verification by our team.',
      type: 'payment_pending',
      data: {
        booking_id: finalBookingId,
        invoice_id: invoiceId,
        payment_reference: paymentReference
      }
    });

    // Create notification for admins to verify payment
    const { data: admins } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.user_id,
        title: 'EFT Payment Verification Required',
        message: `Client has submitted EFT payment proof${invoiceId ? ' for invoice' : ' for booking'} ${invoiceId || finalBookingId}. Reference: ${paymentReference}`,
        type: 'admin_action_required',
        data: {
          booking_id: finalBookingId,
          invoice_id: invoiceId,
          payment_reference: paymentReference,
          proof_url: proofOfPaymentUrl,
          action_type: 'verify_eft_payment'
        }
      }));

      await supabaseClient.from('notifications').insert(adminNotifications);
    }

    console.log('✅ EFT booking processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'EFT payment submitted for verification',
        bookingId: finalBookingId,
        status: 'pending'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in process-eft-booking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('authenticated') ? 401 : 400;
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

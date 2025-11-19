import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingPaymentRequest {
  bookingDetails: {
    nannyId: string;
    clientId: string;
    startDate: string;
    endDate?: string;
    schedule: any;
    services: any;
    bookingType: 'long_term' | 'short_term';
    totalAmount: number;
    baseRate: number;
    additionalServicesCost: number;
  };
  paymentMethod: {
    type: 'paystack' | 'card';
    authorizationCode?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { bookingDetails, paymentMethod }: BookingPaymentRequest = await req.json();

    // Validate booking details
    if (!bookingDetails.nannyId || !bookingDetails.clientId || !bookingDetails.totalAmount) {
      throw new Error('Missing required booking details');
    }

    // Check if nanny is available for the requested dates
    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .eq('nanny_id', bookingDetails.nannyId)
      .eq('status', 'confirmed')
      .overlaps('start_date', bookingDetails.endDate || bookingDetails.startDate)
      .single();

    if (conflictError && conflictError.code !== 'PGRST116') {
      throw new Error('Error checking nanny availability');
    }

    if (conflictingBookings) {
      throw new Error('Nanny is not available for the selected dates');
    }

    // Create the booking with pending status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: bookingDetails.clientId,
        nanny_id: bookingDetails.nannyId,
        start_date: bookingDetails.startDate,
        end_date: bookingDetails.endDate,
        schedule: bookingDetails.schedule,
        services: bookingDetails.services,
        base_rate: bookingDetails.baseRate,
        additional_services_cost: bookingDetails.additionalServicesCost,
        total_monthly_cost: bookingDetails.totalAmount,
        booking_type: bookingDetails.bookingType,
        status: 'pending',
        living_arrangement: bookingDetails.schedule?.livingArrangement || 'live-out'
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    // Process payment based on payment method
    let paymentResult = null;
    
    if (paymentMethod.type === 'paystack' && paymentMethod.authorizationCode) {
      // Process Paystack payment
      const { data: paystackResult, error: paystackError } = await supabase.functions
        .invoke('authorize-payment', {
          body: {
            booking_id: booking.id,
            user_id: user.id,
            amount: Math.round(bookingDetails.totalAmount * 100) // Convert to kobo
          }
        });

      if (paystackError) {
        // Rollback booking creation
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw new Error(`Payment authorization failed: ${paystackError.message}`);
      }

      paymentResult = paystackResult;
    }

    // Update booking status to confirmed if payment successful
    if (paymentResult && paymentResult.status === 'success') {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Failed to update booking status:', updateError);
      }

      // Calculate and store booking financials
      const bookingDays = bookingDetails.endDate 
        ? Math.ceil((new Date(bookingDetails.endDate).getTime() - new Date(bookingDetails.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 1;

      const { data: financials } = await supabase
        .rpc('calculate_booking_revenue', {
          p_booking_id: booking.id,
          p_total_amount: bookingDetails.totalAmount,
          p_booking_type: bookingDetails.bookingType,
          p_monthly_rate_estimate: bookingDetails.baseRate,
          p_booking_days: bookingDays
        });

      if (financials && financials.length > 0) {
        const financial = financials[0];
        await supabase.from('booking_financials').insert({
          booking_id: booking.id,
          booking_type: bookingDetails.bookingType,
          fixed_fee: financial.fixed_fee,
          commission_percent: financial.commission_percent,
          commission_amount: financial.commission_amount,
          admin_total_revenue: financial.admin_total_revenue,
          nanny_earnings: financial.nanny_earnings
        });
      }

      // Create notifications for both parties
      await Promise.all([
        // Notify client
        supabase.from('notifications').insert({
          user_id: bookingDetails.clientId,
          title: 'Booking Confirmed',
          message: 'Your booking has been confirmed and payment processed successfully.',
          type: 'booking_confirmed',
          data: { booking_id: booking.id }
        }),
        // Notify nanny
        supabase.from('notifications').insert({
          user_id: bookingDetails.nannyId,
          title: 'New Booking Received',
          message: 'You have received a new confirmed booking.',
          type: 'new_booking',
          data: { booking_id: booking.id }
        })
      ]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        payment_status: paymentResult?.status || 'pending',
        message: 'Booking created and payment processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing booking payment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
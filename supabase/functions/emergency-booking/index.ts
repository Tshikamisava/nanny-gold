import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyBookingRequest {
  message: string;
  location: string;
  requirements: {
    childrenAges?: string[];
    specialNeeds?: boolean;
    petCare?: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request body
    const { message, location, requirements }: EmergencyBookingRequest = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log(`Emergency booking request from user: ${user.id}`);

    // Find available nannies who can handle emergency requests
    // Priority: high rating, available, nearby location (if specified)
    const { data: availableNannies, error: nanniesError } = await supabaseClient
      .from('nannies')
      .select(`
        id,
        experience_level,
        rating,
        hourly_rate,
        is_available,
        profiles!inner(first_name, last_name, location)
      `)
      .eq('is_available', true)
      .eq('is_verified', true)
      .gte('rating', 4.0) // Only high-rated nannies for emergency
      .order('rating', { ascending: false })
      .limit(10); // Top 10 nannies

    if (nanniesError) {
      console.error('Error fetching nannies:', nanniesError);
      return new Response(
        JSON.stringify({ error: 'Failed to find available nannies' }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!availableNannies || availableNannies.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No emergency nannies available', 
          message: 'We currently have no nannies available for emergency bookings. Please try again later or schedule a regular booking.' 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`Found ${availableNannies.length} available nannies`);

    // Create emergency booking record
    const emergencyBookingData = {
      client_id: user.id,
      nanny_id: availableNannies[0].id, // Assign to top-rated nanny temporarily
      status: 'pending',
      start_date: new Date().toISOString().split('T')[0], // Today
      end_date: new Date().toISOString().split('T')[0], // Same day
      schedule: {
        emergency: true,
        requested_at: new Date().toISOString(),
        response_deadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours from now
      },
      services: {
        emergency: true,
        requirements: requirements,
        message: message
      },
      base_rate: availableNannies[0].hourly_rate || 80, // Emergency rate
      additional_services_cost: 50, // Emergency surcharge
      total_monthly_cost: (availableNannies[0].hourly_rate || 80) + 50,
      notes: `EMERGENCY REQUEST: ${message}`
    };

    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert(emergencyBookingData)
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating emergency booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create emergency booking' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Created emergency booking with ID: ${booking.id}`);

    // Create notifications for all available nannies
    const notifications = availableNannies.map(nanny => ({
      user_id: nanny.id,
      title: '🚨 EMERGENCY BOOKING REQUEST',
      message: `Urgent: Client needs emergency nanny support TODAY. Can you respond within 5 hours? Location: ${location || 'Not specified'}`,
      type: 'emergency_booking',
      data: {
        booking_id: booking.id,
        client_id: user.id,
        location: location,
        requirements: requirements,
        response_deadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        emergency_rate: (availableNannies[0].hourly_rate || 80) + 50
      }
    }));

    const { error: notificationsError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (notificationsError) {
      console.error('Error creating notifications:', notificationsError);
      // Don't fail the request if notifications fail
    }

    console.log(`Sent emergency notifications to ${notifications.length} nannies`);

    // Create notification for client
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        title: '🚨 Emergency Request Submitted',
        message: `Your emergency booking request has been sent to ${availableNannies.length} available nannies. You'll receive confirmation within 5 hours.`,
        type: 'emergency_booking_submitted',
        data: {
          booking_id: booking.id,
          nannies_notified: availableNannies.length,
          response_deadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
        }
      });

    // Schedule automatic fallback after 5 hours (this would typically be done with a cron job)
    // For now, we'll rely on the client to check back or implement push notifications

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        nannies_notified: availableNannies.length,
        response_deadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        message: `Emergency request sent to ${availableNannies.length} available nannies. You'll receive confirmation within 5 hours.`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Emergency booking error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
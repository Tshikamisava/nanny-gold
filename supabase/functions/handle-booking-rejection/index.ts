import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRejectionRequest {
  bookingId: string;
  nannyId: string;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, nannyId, reason }: BookingRejectionRequest = await req.json();

    console.log(`Processing booking rejection: ${bookingId} by nanny: ${nannyId}`);

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        clients:client_id (
          id,
          profiles:id (first_name, last_name, email)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Determine service type based on booking
    const serviceType = booking.booking_type === 'short_term' ? 'short_term' : 'long_term';

    // Find suitable replacement nannies
    const { data: availableNannies, error: nanniesError } = await supabase
      .from('nannies')
      .select(`
        id,
        hourly_rate,
        monthly_rate,
        rating,
        experience_level,
        profiles:id (first_name, last_name, location),
        nanny_services:nanny_id (*)
      `)
      .neq('id', nannyId) // Exclude the rejecting nanny
      .eq('approval_status', 'approved')
      .eq('is_available', true)
      .or(`admin_assigned_categories.cs.{${serviceType}},service_categories.cs.{${serviceType}}`)
      .order('rating', { ascending: false })
      .limit(10);

    if (nanniesError) {
      throw new Error(`Error finding replacement nannies: ${nanniesError.message}`);
    }

    if (!availableNannies || availableNannies.length === 0) {
      // No available nannies - escalate to admin immediately
      await escalateToAdmin(supabase, booking, 'no_available_nannies');
      return new Response(JSON.stringify({ 
        success: true, 
        escalated: true,
        message: 'No available nannies found, escalated to admin'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-assign to the top-rated available nanny
    const newNanny = availableNannies[0];
    const alternativeOptions = availableNannies.slice(1, 6); // Up to 5 alternatives

    // Update booking status to 'reassigned' and assign new nanny
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        nanny_id: newNanny.id,
        status: 'reassigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      throw new Error(`Error updating booking: ${updateError.message}`);
    }

    // Create reassignment record
    const { data: reassignment, error: reassignmentError } = await supabase
      .from('booking_reassignments')
      .insert({
        original_booking_id: bookingId,
        original_nanny_id: nannyId,
        new_nanny_id: newNanny.id,
        client_id: booking.client_id,
        reassignment_reason: reason || 'nanny_rejection',
        alternative_nannies: alternativeOptions.map(n => ({
          id: n.id,
          name: `${n.profiles?.first_name} ${n.profiles?.last_name}`,
          rating: n.rating,
          hourly_rate: n.hourly_rate,
          monthly_rate: n.monthly_rate,
          experience_level: n.experience_level
        }))
      })
      .select()
      .single();

    if (reassignmentError) {
      throw new Error(`Error creating reassignment record: ${reassignmentError.message}`);
    }

    // Send notifications
    await sendReassignmentNotifications(supabase, {
      booking,
      newNanny,
      alternativeOptions,
      reassignmentId: reassignment.id,
      reason: reason || 'nanny_rejection'
    });

    console.log(`Booking ${bookingId} successfully reassigned to nanny ${newNanny.id}`);

    return new Response(JSON.stringify({
      success: true,
      newNannyId: newNanny.id,
      reassignmentId: reassignment.id,
      alternativeCount: alternativeOptions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handle-booking-rejection:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendReassignmentNotifications(supabase: any, data: any) {
  const { booking, newNanny, alternativeOptions, reassignmentId, reason } = data;

  // Notify client about reassignment
  await supabase.from('notifications').insert({
    user_id: booking.client_id,
    title: 'Nanny Reassigned',
    message: `Your booking has been reassigned to ${newNanny.profiles?.first_name} ${newNanny.profiles?.last_name} due to availability changes. You can accept this assignment or choose from other options.`,
    type: 'booking_reassigned',
    data: {
      booking_id: booking.id,
      reassignment_id: reassignmentId,
      new_nanny: {
        id: newNanny.id,
        name: `${newNanny.profiles?.first_name} ${newNanny.profiles?.last_name}`,
        rating: newNanny.rating
      },
      alternative_count: alternativeOptions.length
    }
  });

  // Notify new nanny about assignment
  await supabase.from('notifications').insert({
    user_id: newNanny.id,
    title: 'New Booking Assignment',
    message: `You have been assigned a booking from ${booking.clients?.profiles?.first_name} ${booking.clients?.profiles?.last_name}. Please confirm your availability.`,
    type: 'booking_assigned',
    data: {
      booking_id: booking.id,
      client_name: `${booking.clients?.profiles?.first_name} ${booking.clients?.profiles?.last_name}`,
      start_date: booking.start_date,
      booking_type: booking.booking_type
    }
  });

  // Notify admins
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (admins) {
    for (const admin of admins) {
      await supabase.from('notifications').insert({
        user_id: admin.user_id,
        title: 'Booking Reassigned',
        message: `Booking ${booking.id} has been automatically reassigned due to nanny rejection. Client: ${booking.clients?.profiles?.first_name} ${booking.clients?.profiles?.last_name}`,
        type: 'admin_booking_reassignment',
        data: {
          booking_id: booking.id,
          original_nanny_id: data.originalNannyId,
          new_nanny_id: newNanny.id,
          reason: reason
        }
      });
    }
  }

  // Send email notification to admin
  try {
    await supabase.functions.invoke('send-support-email', {
      body: {
        to: 'care@nannygold.co.za',
        subject: `Booking Reassignment - ${booking.id}`,
        html: `
          <h2>Booking Automatically Reassigned</h2>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Client:</strong> ${booking.clients?.profiles?.first_name} ${booking.clients?.profiles?.last_name}</p>
          <p><strong>New Nanny:</strong> ${newNanny.profiles?.first_name} ${newNanny.profiles?.last_name}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Alternative Options:</strong> ${alternativeOptions.length} available</p>
          <p>Please monitor client response and escalate if needed.</p>
        `
      }
    });
  } catch (emailError) {
    console.error('Failed to send admin email notification:', emailError);
  }
}

async function escalateToAdmin(supabase: any, booking: any, reason: string) {
  // Update booking to require admin intervention
  await supabase
    .from('bookings')
    .update({
      status: 'admin_intervention_required',
      notes: `Escalated: ${reason}`
    })
    .eq('id', booking.id);

  // Notify all admins
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (admins) {
    for (const admin of admins) {
      await supabase.from('notifications').insert({
        user_id: admin.user_id,
        title: 'URGENT: Booking Requires Admin Intervention',
        message: `Booking ${booking.id} needs immediate admin attention: ${reason}`,
        type: 'admin_escalation',
        data: {
          booking_id: booking.id,
          client_id: booking.client_id,
          reason: reason,
          priority: 'urgent'
        }
      });
    }
  }

  // Send urgent email to admin
  try {
    await supabase.functions.invoke('send-support-email', {
      body: {
        to: 'care@nannygold.co.za',
        subject: `URGENT: Admin Intervention Required - Booking ${booking.id}`,
        html: `
          <h2 style="color: red;">URGENT: Admin Intervention Required</h2>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Client:</strong> ${booking.clients?.profiles?.first_name} ${booking.clients?.profiles?.last_name}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Action Required:</strong> Manual nanny assignment or client consultation needed</p>
          <p>Please log into the admin dashboard immediately to resolve this issue.</p>
        `
      }
    });
  } catch (emailError) {
    console.error('Failed to send urgent admin email:', emailError);
  }
}
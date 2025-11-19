import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRequest {
  bookingId?: string;
  reassignmentId?: string;
  reason: string;
  additionalInfo?: string;
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

    const { bookingId, reassignmentId, reason, additionalInfo }: EscalationRequest = await req.json();

    console.log(`Processing escalation: ${reason}`, { bookingId, reassignmentId });

    let booking = null;
    let client = null;

    // Get booking details
    if (bookingId) {
      const { data: bookingData, error: bookingError } = await supabase
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

      if (bookingError) {
        throw new Error(`Booking not found: ${bookingError.message}`);
      }
      booking = bookingData;
      client = booking.clients;
    }

    // Get reassignment details if provided
    if (reassignmentId) {
      const { data: reassignmentData, error: reassignmentError } = await supabase
        .from('booking_reassignments')
        .select(`
          *,
          bookings:original_booking_id (
            *,
            clients:client_id (
              id,
              profiles:id (first_name, last_name, email)
            )
          )
        `)
        .eq('id', reassignmentId)
        .single();

      if (reassignmentError) {
        throw new Error(`Reassignment not found: ${reassignmentError.message}`);
      }

      // Mark reassignment as escalated
      await supabase
        .from('booking_reassignments')
        .update({
          escalated_to_admin: true,
          admin_notes: `Escalated: ${reason} - ${additionalInfo || 'No additional info'}`
        })
        .eq('id', reassignmentId);

      booking = reassignmentData.bookings;
      client = booking.clients;
    }

    if (!booking || !client) {
      throw new Error('Could not find booking or client information');
    }

    // Update booking status to require admin intervention
    await supabase
      .from('bookings')
      .update({
        status: 'admin_intervention_required',
        notes: `${booking.notes || ''}\n\nESCALATED: ${reason} - ${additionalInfo || ''}`
      })
      .eq('id', booking.id);

    // Get all admins
    const { data: admins, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminError) {
      throw new Error(`Error fetching admins: ${adminError.message}`);
    }

    // Notify all admins
    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.user_id,
        title: 'URGENT: Booking Escalation',
        message: `Booking ${booking.id} requires immediate attention. Reason: ${reason}`,
        type: 'admin_escalation',
        data: {
          booking_id: booking.id,
          client_id: client.id,
          client_name: `${client.profiles?.first_name} ${client.profiles?.last_name}`,
          reason: reason,
          priority: 'urgent',
          reassignment_id: reassignmentId || null,
          additional_info: additionalInfo
        }
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(adminNotifications);

      if (notificationError) {
        console.error('Error creating admin notifications:', notificationError);
      }
    }

    // Send urgent email notification to admin
    try {
      const emailBody = `
        <h2 style="color: red;">URGENT: Booking Escalation</h2>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Client:</strong> ${client.profiles?.first_name} ${client.profiles?.last_name}</p>
        <p><strong>Client Email:</strong> ${client.profiles?.email}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        ${reassignmentId ? `<p><strong>Reassignment ID:</strong> ${reassignmentId}</p>` : ''}
        ${additionalInfo ? `<p><strong>Additional Info:</strong> ${additionalInfo}</p>` : ''}
        <p><strong>Booking Type:</strong> ${booking.booking_type}</p>
        <p><strong>Start Date:</strong> ${booking.start_date}</p>
        <p><strong>Status:</strong> ${booking.status}</p>
        <hr>
        <p><strong>Action Required:</strong> Manual intervention needed immediately</p>
        <p>Please log into the admin dashboard to resolve this issue.</p>
      `;

      await supabase.functions.invoke('send-support-email', {
        body: {
          to: 'care@nannygold.co.za',
          subject: `URGENT ESCALATION: Booking ${booking.id} - ${reason}`,
          html: emailBody
        }
      });
    } catch (emailError) {
      console.error('Failed to send escalation email:', emailError);
    }

    // Notify client about escalation
    await supabase.from('notifications').insert({
      user_id: client.id,
      title: 'Issue Escalated to Support',
      message: 'Your booking issue has been escalated to our support team. They will contact you within 2 hours to resolve this matter.',
      type: 'escalation_confirmation',
      data: {
        booking_id: booking.id,
        reason: reason,
        escalated_at: new Date().toISOString()
      }
    });

    console.log(`Successfully escalated booking ${booking.id} for reason: ${reason}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Issue escalated successfully',
      booking_id: booking.id,
      escalation_reason: reason
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in escalate-booking-issue:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
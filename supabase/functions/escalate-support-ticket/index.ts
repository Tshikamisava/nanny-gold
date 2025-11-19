import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EscalationRequest {
  ticketId: string;
  escalationReason: string;
  targetPriority: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, escalationReason, targetPriority }: EscalationRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing ticket escalation:', { ticketId, escalationReason, targetPriority });

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        profiles!inner(first_name, last_name, email)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError) throw ticketError;

    // Update ticket priority and status
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        priority: targetPriority,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    // Log escalation in chat
    const { error: chatError } = await supabase
      .from('support_chat_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        message: `🔺 ESCALATED: This ticket has been escalated to ${targetPriority} priority. Reason: ${escalationReason}`,
        is_internal: true
      });

    if (chatError) throw chatError;

    // Get all admins for notifications
    const { data: admins, error: adminsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminsError) throw adminsError;

    // Create notifications for all admins
    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        title: `🚨 Escalated Support Ticket - ${targetPriority.toUpperCase()} Priority`,
        message: `Ticket "${ticket.subject}" has been escalated to ${targetPriority} priority. Immediate attention required.`,
        type: 'ticket_escalation',
        data: {
          ticket_id: ticketId,
          escalation_reason: escalationReason,
          original_priority: ticket.priority,
          new_priority: targetPriority
        }
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) console.error('Failed to create notifications:', notificationError);
    }

    // Send escalation email for urgent tickets
    if (targetPriority === 'urgent') {
      await resend.emails.send({
        from: "NannyGold Support <support@nannygold.co.za>",
        to: ["care@nannygold.co.za", "admin@nannygold.co.za"],
        subject: `🚨 URGENT ESCALATION: Support Ticket #${ticketId}`,
        html: `
          <h2>🚨 URGENT TICKET ESCALATION</h2>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Customer:</strong> ${ticket.profiles.first_name} ${ticket.profiles.last_name} (${ticket.profiles.email})</p>
          <p><strong>Escalation Reason:</strong> ${escalationReason}</p>
          <p><strong>Original Priority:</strong> ${ticket.priority}</p>
          <p><strong>New Priority:</strong> ${targetPriority}</p>
          <hr>
          <p><strong>Original Description:</strong></p>
          <p>${ticket.description}</p>
          <hr>
          <p><em>This ticket requires immediate attention. Please respond within 1 hour.</em></p>
        `,
      });
    }

    console.log("Ticket escalated successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Ticket escalated successfully',
      ticketId,
      newPriority: targetPriority 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in escalate-support-ticket function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
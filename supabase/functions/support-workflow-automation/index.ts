import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running support workflow automation...');

    // 1. Auto-escalate old unresolved tickets
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: oldTickets, error: oldTicketsError } = await supabase
      .from('support_tickets')
      .select(`
        id, subject, priority, created_at,
        profiles!inner(first_name, last_name, email)
      `)
      .in('status', ['open', 'in_progress'])
      .lt('created_at', twoDaysAgo.toISOString())
      .neq('priority', 'urgent');

    if (oldTicketsError) throw oldTicketsError;

    // Escalate old tickets
    if (oldTickets && oldTickets.length > 0) {
      for (const ticket of oldTickets) {
        const newPriority = ticket.priority === 'low' ? 'medium' : 'high';
        
        // Update priority
        await supabase
          .from('support_tickets')
          .update({ 
            priority: newPriority,
            updated_at: new Date().toISOString()
          })
          .eq('id', ticket.id);

        // Add escalation note
        await supabase
          .from('support_chat_messages')
          .insert({
            ticket_id: ticket.id,
            sender_id: null, // System message
            message: `⏰ AUTO-ESCALATED: This ticket has been automatically escalated to ${newPriority} priority due to age (${Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24))} days old).`,
            is_internal: true
          });

        console.log(`Auto-escalated ticket ${ticket.id} to ${newPriority} priority`);
      }
    }

    // 2. Send daily summary to admins
    const { data: dailyStats, error: statsError } = await supabase
      .rpc('get_support_stats');

    if (!statsError && dailyStats) {
      const { data: admins } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(email, first_name)
        `)
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await resend.emails.send({
            from: "NannyGold Support <support@nannygold.co.za>",
            to: [admin.profiles.email],
            subject: "Daily Support Summary",
            html: `
              <h2>Daily Support Summary - ${new Date().toDateString()}</h2>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <h3>Ticket Statistics</h3>
                <ul>
                  <li><strong>Open Tickets:</strong> ${dailyStats.open_tickets || 0}</li>
                  <li><strong>In Progress:</strong> ${dailyStats.in_progress_tickets || 0}</li>
                  <li><strong>Resolved Today:</strong> ${dailyStats.resolved_today || 0}</li>
                  <li><strong>Urgent Tickets:</strong> ${dailyStats.urgent_tickets || 0}</li>
                  <li><strong>Pending Disputes:</strong> ${dailyStats.pending_disputes || 0}</li>
                </ul>
              </div>
              <br>
              <p>Have a great day!</p>
              <p><em>The NannyGold Support System</em></p>
            `,
          });
        }
      }
    }

    // 3. Check for tickets requiring follow-up
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: followUpTickets, error: followUpError } = await supabase
      .from('support_tickets')
      .select(`
        id, subject, status, updated_at,
        profiles!inner(first_name, last_name, email)
      `)
      .eq('status', 'resolved')
      .gte('updated_at', yesterday.toISOString())
      .lt('updated_at', new Date().toISOString());

    if (!followUpError && followUpTickets && followUpTickets.length > 0) {
      // Send follow-up emails to customers
      for (const ticket of followUpTickets) {
        await resend.emails.send({
          from: "NannyGold Support <support@nannygold.co.za>",
          to: [ticket.profiles.email],
          subject: "How was your support experience?",
          html: `
            <h2>Thank you for using NannyGold Support!</h2>
            <p>Hi ${ticket.profiles.first_name},</p>
            <p>We hope we were able to resolve your recent support request: <strong>"${ticket.subject}"</strong></p>
            <p>We'd love to hear about your experience. Your feedback helps us improve our service.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:feedback@nannygold.co.za?subject=Support Feedback - Ticket ${ticket.id}" 
                 style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Share Feedback
              </a>
            </div>
            <p>Best regards,<br>The NannyGold Team</p>
          `,
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Workflow automation completed',
      escalatedTickets: oldTickets?.length || 0,
      followUpSent: followUpTickets?.length || 0
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in support-workflow-automation:", error);
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
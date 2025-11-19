import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportTicketNotification {
  ticketId: string;
  subject: string;
  description: string;
  priority: string;
  category: string;
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ticketId, 
      subject, 
      description, 
      priority, 
      category, 
      userEmail, 
      userName 
    }: SupportTicketNotification = await req.json();

    console.log(`New support ticket notification: ${ticketId}`);

    // Create email content
    const priorityBadge = priority === 'urgent' ? 
      '<span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🚨 URGENT</span>' :
      priority === 'high' ?
      '<span style="background: #ea580c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">HIGH</span>' :
      '<span style="background: #6b7280; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">MEDIUM</span>';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🎫 New Support Ticket</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="color: #374151; margin: 0;">${subject}</h2>
              ${priorityBadge}
            </div>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">Description:</h3>
              <p style="margin: 0; color: #6b7280; line-height: 1.6;">${description.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 14px;">
                <div>
                  <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Customer:</p>
                  <p style="margin: 0; color: #6b7280;">${userName}</p>
                  <p style="margin: 5px 0 0 0; color: #6b7280;">${userEmail}</p>
                </div>
                <div>
                  <p style="margin: 0 0 5px 0; font-weight: bold; color: #374151;">Details:</p>
                  <p style="margin: 0; color: #6b7280;">Category: ${category}</p>
                  <p style="margin: 5px 0 0 0; color: #6b7280;">Ticket ID: ${ticketId}</p>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="https://app.nannygold.co.za/admin/support" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View in Admin Dashboard →
              </a>
            </div>
          </div>
        </div>
        
        <div style="background: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2024 NannyGold Support Team</p>
        </div>
      </div>
    `;

    // Send email to care@nannygold.co.za
    const emailResponse = await resend.emails.send({
      from: "NannyGold Support <donotreply@nannygold.co.za>",
      to: ["care@nannygold.co.za"],
      subject: `New Support Ticket: ${subject} [${priority.toUpperCase()}]`,
      html: emailHtml,
    });

    console.log("Support ticket notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResponse.data?.id,
      ticketId 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in notify-support-ticket function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
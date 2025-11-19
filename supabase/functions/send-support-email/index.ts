import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  type: 'broadcast' | 'escalation' | 'urgent';
  recipients: string[];
  subject: string;
  content: string;
  priority?: string;
  ticketId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      recipients, 
      subject, 
      content, 
      priority = 'info',
      ticketId 
    }: SupportEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${recipients.length} recipients`);

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients specified');
    }

    // Email template based on type
    let emailHtml = '';
    let fromAddress = 'NannyGold Support <support@nannygold.co.za>';

    if (type === 'broadcast') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #6366f1; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📢 ${subject}</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              ${priority === 'urgent' ? '<div style="background: #fee2e2; color: #dc2626; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-weight: bold;">🚨 URGENT ANNOUNCEMENT</div>' : ''}
              
              <div style="font-size: 16px; line-height: 1.6; color: #374151;">
                ${content.replace(/\n/g, '<br>')}
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  This message was sent to all ${recipients.length === 1 ? 'admin users' : 'users'} of the NannyGold platform.
                </p>
              </div>
            </div>
          </div>
          
          <div style="background: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 NannyGold. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">
              <a href="https://app.nannygold.co.za" style="color: #6366f1;">Visit NannyGold Dashboard</a>
            </p>
          </div>
        </div>
      `;
    } else if (type === 'escalation' || type === 'urgent') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🚨 ${type === 'urgent' ? 'URGENT' : 'ESCALATED'} Support Request</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="color: #dc2626; margin-top: 0;">${subject}</h2>
              
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #dc2626;">
                  ${type === 'urgent' ? 'This requires immediate attention!' : 'This ticket has been escalated and needs prompt response.'}
                </p>
              </div>
              
              <div style="font-size: 16px; line-height: 1.6; color: #374151; margin: 20px 0;">
                ${content.replace(/\n/g, '<br>')}
              </div>
              
              ${ticketId ? `
                <div style="margin-top: 30px;">
                  <a href="https://app.nannygold.co.za/admin/support" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    View Ticket →
                  </a>
                </div>
              ` : ''}
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
                <p style="margin: 0;"><strong>Ticket ID:</strong> ${ticketId || 'N/A'}</p>
                <p style="margin: 5px 0 0 0;"><strong>Priority:</strong> ${priority.toUpperCase()}</p>
              </div>
            </div>
          </div>
          
          <div style="background: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 NannyGold Support Team</p>
          </div>
        </div>
      `;
    }

    // Send email to each recipient (Resend allows multiple recipients)
    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResponse.data?.id,
      recipients: recipients.length,
      type 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
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
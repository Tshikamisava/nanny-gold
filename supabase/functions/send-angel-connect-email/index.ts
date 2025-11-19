import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AngelConnectRequest {
  clientEmail: string;
  clientName: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientEmail, clientName, message }: AngelConnectRequest = await req.json();

    if (!clientEmail || !clientName) {
      return new Response(
        JSON.stringify({ error: "Client email and name are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const defaultMessage = `Hi NannyGold Team,

I'd love to connect with one of your Angels for some home and childcare support.

Looking forward to hearing from you!

Thanks,  
${clientName}`;

    const emailResponse = await resend.emails.send({
      from: "NannyGold <care@nannygold.co.za>",
      to: ["care@nannygold.co.za"],
      replyTo: clientEmail,
      subject: "Connect me with a NannyGold Angel ✨",
      text: message || defaultMessage,
    });

    console.log("Angel connect email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-angel-connect-email function:", error);
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
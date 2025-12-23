import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string[]
  from: 'care' | 'bespoke'
  subject: string
  html: string
  replyTo?: string
  senderName?: string
  userId: string
  userRole: 'client' | 'nanny' | 'admin'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, from, subject, html, replyTo, senderName, userId, userRole }: EmailRequest = await req.json()

    // Validate user matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine sender email based on selection
    const fromEmail = from === 'care' 
      ? 'care@nannygold.co.za' 
      : 'bespoke@nannygold.co.za'

    const fromName = from === 'care'
      ? 'NannyGold Care Team'
      : 'NannyGold Bespoke Services'

    // Prepare email signature
    const signature = `
      <br><br>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;"><strong>${fromName}</strong></p>
        <p style="margin: 5px 0;">335 Long Avenue, Ferndale</p>
        <p style="margin: 5px 0;">Johannesburg, Gauteng</p>
        <p style="margin: 5px 0;">Email: ${fromEmail}</p>
        <p style="margin: 5px 0;">Web: <a href="https://nannygold.co.za" style="color: #f59e0b;">nannygold.co.za</a></p>
      </div>
    `

    // Add sender info to email body
    const senderInfo = senderName 
      ? `<p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">Sent on behalf of ${senderName} (${userRole})</p>`
      : ''

    const fullHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${senderInfo}
        ${html}
        ${signature}
      </div>
    `

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: to,
        subject: subject,
        html: fullHtml,
        reply_to: replyTo || fromEmail,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    // Log email in database
    await supabaseClient
      .from('email_logs')
      .insert({
        user_id: userId,
        user_role: userRole,
        from_address: fromEmail,
        to_addresses: to,
        subject: subject,
        status: 'sent',
        resend_id: data.id,
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: data.id,
        from: fromEmail 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

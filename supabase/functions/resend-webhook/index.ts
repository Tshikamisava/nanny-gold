import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const event = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Update email log based on event type
    const updates: any = { updated_at: new Date().toISOString() }

    switch (event.type) {
      case 'email.delivered':
        updates.delivery_status = 'delivered'
        break
      case 'email.opened':
        updates.delivery_status = 'opened'
        updates.opened_at = new Date().toISOString()
        break
      case 'email.bounced':
        updates.delivery_status = 'bounced'
        updates.bounce_reason = event.data.reason
        break
      case 'email.delivery_delayed':
        updates.delivery_status = 'delayed'
        break
    }

    if (event.data?.email_id) {
      await supabaseClient
        .from('invoice_email_logs')
        .update(updates)
        .eq('resend_email_id', event.data.email_id)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
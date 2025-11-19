import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { invoice_ids } = await req.json()

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

    let successCount = 0
    let errorCount = 0

    for (const invoiceId of invoice_ids) {
      try {
        // Get invoice details
        const { data: invoice, error: invoiceError } = await supabaseClient
          .from('invoices')
          .select('booking_id, status, paid_date, payment_method, payment_reference')
          .eq('id', invoiceId)
          .single()

        if (invoiceError) throw invoiceError

        // Delete old invoice
        await supabaseClient.from('invoices').delete().eq('id', invoiceId)

        // Generate new invoice
        const { data, error } = await supabaseClient.functions.invoke('generate-booking-invoice', {
          body: { booking_id: invoice.booking_id }
        })

        if (error) throw error

        // Restore payment status if it was paid
        if (invoice.status === 'paid') {
          await supabaseClient
            .from('invoices')
            .update({
              status: 'paid',
              paid_date: invoice.paid_date,
              payment_method: invoice.payment_method,
              payment_reference: invoice.payment_reference
            })
            .eq('id', data.invoice.id)
        }

        successCount++
      } catch (error) {
        console.error(`Failed to regenerate invoice ${invoiceId}:`, error)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({ success: successCount, errors: errorCount }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
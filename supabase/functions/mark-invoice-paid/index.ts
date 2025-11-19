import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { invoice_id, payment_date, payment_reference, payment_method } = await req.json()

    if (!invoice_id || !payment_reference) {
      throw new Error('Invoice ID and payment reference are required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update invoice to paid status
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: payment_date || new Date().toISOString(),
        payment_reference: payment_reference,
        payment_method: payment_method || 'eft'
      })
      .eq('id', invoice_id)
      .select(`
        *,
        bookings!inner(
          id,
          client_id,
          nanny_id,
          status,
          booking_type
        )
      `)
      .single()

    if (invoiceError) {
      console.error('Invoice update error:', invoiceError)
      throw invoiceError
    }

    console.log('✅ Invoice marked as paid:', invoice)

    // Update booking status to confirmed (if pending)
    if (invoice.bookings?.status === 'pending') {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', invoice.booking_id)

      console.log('✅ Booking status updated to confirmed')
    }

    // Update booking_financials to mark placement fee as collected
    const { error: financialsError } = await supabase
      .from('booking_financials')
      .update({
        placement_fee_collected: true,
        collected_at: new Date().toISOString()
      })
      .eq('booking_id', invoice.booking_id)

    if (financialsError) {
      console.warn('⚠️ Could not update booking financials:', financialsError)
      // Don't fail the operation if financials update fails
    }

    // Get client and nanny names for notifications
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', invoice.bookings.client_id)
      .single()

    const { data: nannyProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', invoice.bookings.nanny_id)
      .single()

    const clientName = `${clientProfile?.first_name || ''} ${clientProfile?.last_name || ''}`.trim()
    const nannyName = `${nannyProfile?.first_name || ''} ${nannyProfile?.last_name || ''}`.trim()

    // Notify client about payment confirmation
    await supabase
      .from('notifications')
      .insert({
        user_id: invoice.bookings.client_id,
        title: 'Payment Confirmed',
        message: `Your payment of R${invoice.amount.toFixed(2)} has been confirmed. Your booking is now active!`,
        type: 'payment_confirmed',
        data: {
          invoice_id: invoice_id,
          booking_id: invoice.booking_id,
          amount: invoice.amount,
          payment_reference: payment_reference
        }
      })

    console.log('🔔 Client notification created')

    // Notify nanny about new confirmed booking
    await supabase
      .from('notifications')
      .insert({
        user_id: invoice.bookings.nanny_id,
        title: 'New Confirmed Booking',
        message: `You have a new confirmed booking with ${clientName}. Please review the booking details.`,
        type: 'booking_confirmed',
        data: {
          booking_id: invoice.booking_id,
          client_name: clientName
        }
      })

    console.log('🔔 Nanny notification created')

    // Send confirmation emails
    try {
      // Email to client
      if (clientProfile?.email) {
        await supabase.functions.invoke('send-angel-connect-email', {
          body: {
            to: clientProfile.email,
            subject: 'Payment Confirmed - Booking Active',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Payment Confirmed!</h2>
                <p>Dear ${clientName},</p>
                <p>We have received your payment and your booking is now <strong>active</strong>.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
                  <p><strong>Amount Paid:</strong> R${invoice.amount.toFixed(2)}</p>
                  <p><strong>Payment Reference:</strong> ${payment_reference}</p>
                  <p><strong>Payment Date:</strong> ${new Date(payment_date || Date.now()).toLocaleDateString('en-ZA')}</p>
                </div>
                
                <p>Your nanny (${nannyName}) has been notified and will be ready for your booking.</p>
                <p>Thank you for choosing NannyGold!</p>
              </div>
            `
          }
        })
      }

      // Email to nanny
      if (nannyProfile?.email) {
        await supabase.functions.invoke('send-angel-connect-email', {
          body: {
            to: nannyProfile.email,
            subject: 'New Confirmed Booking',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Confirmed Booking</h2>
                <p>Dear ${nannyName},</p>
                <p>You have a new confirmed booking with ${clientName}.</p>
                <p>Please log in to your dashboard to view the booking details and prepare for your assignment.</p>
                <p>Thank you for being part of NannyGold!</p>
              </div>
            `
          }
        })
      }

      console.log('📧 Confirmation emails sent')
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Don't fail the operation if emails fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice marked as paid and booking confirmed',
        invoice
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Error marking invoice as paid:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to mark invoice as paid',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

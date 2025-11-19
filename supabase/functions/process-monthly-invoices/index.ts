import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Starting monthly invoice generation...')

    // Get all active/confirmed long-term bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        nanny_id,
        status,
        booking_type,
        start_date,
        base_rate,
        total_monthly_cost,
        living_arrangement,
        clients!inner(home_size)
      `)
      .in('status', ['confirmed', 'active'])
      .lte('start_date', new Date().toISOString().split('T')[0])

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw bookingsError
    }

    console.log(`📋 Found ${bookings?.length || 0} active bookings to process`)

    const results = {
      generated: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{ booking_id: string; status: string; message: string }>
    }

    // Get current month start/end
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    for (const booking of bookings || []) {
      try {
        // Check if invoice already exists for this month
        const { data: existingInvoices, error: checkError } = await supabase
          .from('invoices')
          .select('id, invoice_number')
          .eq('booking_id', booking.id)
          .gte('issue_date', monthStart.toISOString().split('T')[0])
          .lte('issue_date', monthEnd.toISOString().split('T')[0])

        if (checkError) {
          console.error(`Error checking existing invoices for booking ${booking.id}:`, checkError)
          results.errors++
          results.details.push({
            booking_id: booking.id,
            status: 'error',
            message: `Check failed: ${checkError.message}`
          })
          continue
        }

        if (existingInvoices && existingInvoices.length > 0) {
          console.log(`⏭️  Invoice already exists for booking ${booking.id}: ${existingInvoices[0].invoice_number}`)
          results.skipped++
          results.details.push({
            booking_id: booking.id,
            status: 'skipped',
            message: `Invoice ${existingInvoices[0].invoice_number} already exists`
          })
          continue
        }

        // Generate invoice using existing function
        console.log(`💰 Generating invoice for booking ${booking.id}`)
        
        const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke(
          'generate-booking-invoice',
          {
            body: { booking_id: booking.id }
          }
        )

        if (invoiceError) {
          console.error(`Error generating invoice for booking ${booking.id}:`, invoiceError)
          results.errors++
          results.details.push({
            booking_id: booking.id,
            status: 'error',
            message: `Generation failed: ${invoiceError.message}`
          })
          continue
        }

        console.log(`✅ Invoice generated for booking ${booking.id}:`, invoiceResult.invoice?.invoice_number)

        // Create payment schedule for automatic processing (25th of month)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const authorizationDate = new Date(now.getFullYear(), now.getMonth() + 1, 25)
        const captureDate = new Date(now.getFullYear(), now.getMonth() + 2, 1)

        const { error: scheduleError } = await supabase
          .from('payment_schedules')
          .insert({
            booking_id: booking.id,
            client_id: booking.client_id,
            amount: booking.total_monthly_cost,
            authorization_day: 25,
            capture_day: 1,
            next_authorization_date: authorizationDate.toISOString(),
            next_capture_date: captureDate.toISOString(),
            status: 'active'
          })

        if (scheduleError) {
          console.error(`Warning: Failed to create payment schedule for booking ${booking.id}:`, scheduleError)
        } else {
          console.log(`📅 Payment schedule created for booking ${booking.id}`)
        }

        results.generated++
        results.details.push({
          booking_id: booking.id,
          status: 'success',
          message: `Invoice ${invoiceResult.invoice?.invoice_number} generated`
        })

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error)
        results.errors++
        results.details.push({
          booking_id: booking.id,
          status: 'error',
          message: error.message || 'Unknown error'
        })
      }
    }

    console.log('📊 Invoice generation summary:', results)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total_bookings: bookings?.length || 0,
          generated: results.generated,
          skipped: results.skipped,
          errors: results.errors
        },
        details: results.details
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Monthly invoice generation failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate monthly invoices',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

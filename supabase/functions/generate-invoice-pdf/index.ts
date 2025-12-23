import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'
import { jsPDF } from 'npm:jspdf@2.5.2'

// Helper to calculate total hours from schedule
function calculateTotalHours(schedule: any): number {
  if (!schedule?.timeSlots || !schedule?.selectedDates) {
    return 8; // Default fallback
  }
  
  const dailyHours = schedule.timeSlots.reduce((total: number, slot: any) => {
    const start = new Date(`2000-01-01T${slot.start}:00`);
    const end = new Date(`2000-01-01T${slot.end}:00`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);
  
  return dailyHours * schedule.selectedDates.length;
}

// Helper to calculate hourly rate (subtracting R35 booking fee for short-term)
function calculateHourlyRate(booking: any): number {
  const totalHours = calculateTotalHours(booking.schedule);
  if (totalHours === 0) return 0;
  const bookingFee = 35;
  const serviceAmount = booking.base_rate - bookingFee;
  return serviceAmount / totalHours;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { invoice_id } = await req.json()
    console.log('🔍 Generating PDF for invoice:', invoice_id)

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

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (invoiceError) {
      console.error('❌ Invoice fetch error:', invoiceError)
      throw invoiceError
    }
    console.log('✅ Invoice fetched:', invoice.invoice_number)

    // Fetch client profile
    const { data: clientProfile, error: clientError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email, phone, location')
      .eq('id', invoice.client_id)
      .single()

    if (clientError) {
      console.error('❌ Client profile fetch error:', clientError)
    }
    console.log('✅ Client profile fetched:', clientProfile?.email || 'No email')

    // Validate invoice data before proceeding
    if (!invoice) {
      throw new Error('Invoice not found')
    }

    console.log('📋 PDF Data Validation:', {
      hasInvoice: !!invoice,
      hasClientProfile: !!clientProfile,
      invoiceNumber: invoice.invoice_number,
      clientName: clientProfile ? `${clientProfile.first_name} ${clientProfile.last_name}` : 'Missing'
    })

    // Fetch booking and nanny details if booking exists
    let booking = null
    let nannyProfile = null
    
    if (invoice.booking_id) {
      const { data: bookingData, error: bookingError } = await supabaseClient
        .from('bookings')
        .select('id, start_date, end_date, booking_type, living_arrangement, base_rate, schedule, nanny_id')
        .eq('id', invoice.booking_id)
        .single()

      if (bookingError) {
        console.error('❌ Booking fetch error:', bookingError)
      } else {
        booking = bookingData
        console.log('✅ Booking fetched:', booking.id)

        // Fetch nanny profile if we have booking
        if (booking?.nanny_id) {
          const { data: nannyData, error: nannyError } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', booking.nanny_id)
            .single()

          if (nannyError) {
            console.error('❌ Nanny profile fetch error:', nannyError)
          } else {
            nannyProfile = nannyData
            console.log('✅ Nanny profile fetched:', nannyProfile.first_name)
          }
        }
      }
    } else {
      console.log('ℹ️ No booking associated with this invoice')
    }

    // Create PDF
    const doc = new jsPDF()

    // Header with branding - NannyGold style
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    // Fuchsia Pink "Nanny" (hsl(330 78% 56%) = rgb(217, 70, 239))
    doc.setTextColor(139, 92, 246)
    doc.text('Nanny', 20, 20)
    // Gold "Gold" (hsl(38 94% 50%) = rgb(245, 158, 11))
    doc.setTextColor(245, 158, 11)
    doc.text('Gold', 51, 20)
    // Gray "(Pty) Ltd" - keep at 24pt for consistent spacing
    doc.setTextColor(100, 100, 100)
    doc.text('(Pty) Ltd', 75, 20)

    // Now change font size for the rest of the header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Premium Nanny Services', 20, 27)
    doc.text('Email: care@nannygold.co.za', 20, 32)
    doc.text('Phone: 066 273 3942', 20, 37)

    // Invoice title
    doc.setFontSize(18)
    doc.setTextColor(0, 0, 0)
    doc.text('INVOICE', 150, 20)

    // Invoice details box
    doc.setFontSize(10)
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 150, 30)
    doc.text(`Issue Date: ${new Date(invoice.issue_date).toLocaleDateString('en-ZA')}`, 150, 36)
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-ZA')}`, 150, 42)

    // Client details with address - use robust fallbacks
    doc.setFontSize(12)
    doc.text('Bill To:', 20, 50)
    doc.setFontSize(10)
    const clientFullName = clientProfile ? 
      `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() : 
      'Client Name Not Available'
    const clientEmail = clientProfile?.email || 'Email not available'
    const clientPhone = clientProfile?.phone || ''
    const clientLocation = clientProfile?.location || ''
    
    doc.text(clientFullName, 20, 57)
    doc.text(clientEmail, 20, 63)
    let yPosClient = 69
    if (clientPhone) {
      doc.text(clientPhone, 20, yPosClient)
      yPosClient += 6
    }
    if (clientLocation) {
      doc.text(clientLocation, 20, yPosClient)
      yPosClient += 6
    }
    
    // Booking Details Box (if available)
    if (booking) {
      let yPosBooking = yPosClient + 2
      
      // Light gray background box
      doc.setFillColor(249, 250, 251)
      doc.rect(20, yPosBooking, 170, 28, 'F')
      
      // Box border
      doc.setDrawColor(229, 231, 235)
      doc.setLineWidth(0.5)
      doc.rect(20, yPosBooking, 170, 28, 'S')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Booking Details', 25, yPosBooking + 7)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(75, 85, 99)
      
      let col1Y = yPosBooking + 14
      let col2Y = yPosBooking + 14
      
      // Nanny Name - Always show
      if (nannyProfile) {
        const nannyFullName = `${nannyProfile.first_name || ''} ${nannyProfile.last_name || ''}`.trim()
        doc.text(`Nanny Name: ${nannyFullName}`, 25, col1Y)
        col1Y += 5
      }
      
      // Service Type - Always show
      if (booking.booking_type) {
        const serviceType = booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Care'
        doc.text(`Service Type: ${serviceType}`, 25, col1Y)
        col1Y += 5
      }
      
      // Conditional content based on booking type
      if (booking.booking_type === 'long_term') {
        // Long-term: Show living arrangement
        if (booking.living_arrangement) {
          const arrangement = booking.living_arrangement === 'live_in' ? 'Live In' : 'Live Out'
          doc.text(`Living Arrangement: ${arrangement}`, 25, col1Y)
        }
      } else {
        // Short-term: Show total hours
        const totalHours = calculateTotalHours(booking.schedule)
        doc.text(`Total Hours: ${totalHours} hours`, 25, col1Y)
      }
      
      // Start Date - Always show
      if (booking.start_date) {
        const startDate = new Date(booking.start_date).toLocaleDateString('en-ZA')
        doc.text(`Start Date: ${startDate}`, 110, col2Y)
        col2Y += 5
      }
      
      // End Date - Only for short-term
      if (booking.booking_type !== 'long_term' && booking.end_date) {
        const endDate = new Date(booking.end_date).toLocaleDateString('en-ZA')
        doc.text(`End Date: ${endDate}`, 110, col2Y)
        col2Y += 5
      }
      
      // Rate display based on booking type
      if (booking.booking_type === 'long_term') {
        if (booking.base_rate) {
          doc.text(`Monthly Service Fee: R${booking.base_rate.toFixed(2)}`, 110, col2Y)
        }
      } else {
        // Short-term: Show hourly service fee
        const hourlyRate = calculateHourlyRate(booking)
        doc.text(`Hourly Service Fee: R${hourlyRate.toFixed(2)}`, 110, col2Y)
      }
    }

    // Line items table (adjust Y position based on booking details)
    let lineItemsStartY = 120; // Increased to accommodate booking details
    doc.setFontSize(12)
    doc.text('Description', 20, lineItemsStartY)
    doc.text('Amount', 150, lineItemsStartY, { align: 'right' })
    doc.line(20, lineItemsStartY + 2, 190, lineItemsStartY + 2)

    let yPos = lineItemsStartY + 10
    // Line items - already parsed from JSONB
    const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : []
    console.log(`📝 Processing ${lineItems.length} line items for invoice ${invoice.invoice_number}`)
    lineItems.forEach((item: any) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(item.description, 20, yPos)
      doc.text(`R${item.amount.toFixed(2)}`, 190, yPos, { align: 'right' })
      yPos += 7
    })

    // Total
    doc.line(20, yPos, 190, yPos)
    yPos += 7
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Total Amount:', 100, yPos)
    doc.text(`R${invoice.amount.toFixed(2)}`, 190, yPos, { align: 'right' })

    // What's Due Today Box (for long-term bookings)
    if (booking?.booking_type === 'long_term') {
      yPos += 10
      
      // Blue tinted background
      doc.setFillColor(239, 246, 255)
      doc.rect(20, yPos, 170, 30, 'F')
      
      // Border
      doc.setDrawColor(191, 219, 254)
      doc.setLineWidth(0.5)
      doc.rect(20, yPos, 170, 30, 'S')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 64, 175)
      doc.text('Payment Terms', 25, yPos + 7)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(55, 65, 81)
      
      // Calculate placement fee (invoice amount)
      const placementFee = invoice.amount
      const monthlyFee = booking.base_rate || 0
      
      doc.text(`What's Due Today: R${placementFee.toFixed(2)}`, 25, yPos + 15)
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text('(One-time placement fee - covers onboarding, vetting, and support)', 25, yPos + 20)
      
      doc.setFontSize(9)
      doc.setTextColor(55, 65, 81)
      doc.text(`Monthly Service Fee: R${monthlyFee.toFixed(2)}`, 25, yPos + 26)
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text('(Recurring monthly on the 1st of each month)', 110, yPos + 26)
      
      yPos += 30
    }

    // Banking details box
    yPos += 15
    doc.setFillColor(254, 243, 199) // Yellow background
    doc.rect(20, yPos, 170, 35, 'F')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Banking Details', 25, yPos + 7)
    doc.setFontSize(9)
    doc.text('Account Name: NannyGold (Pty) Ltd', 25, yPos + 14)
    doc.text('Bank: Capitec Business', 25, yPos + 19)
    doc.text('Account Number: 1054131465', 25, yPos + 24)
    doc.text('Branch Code: 450105', 25, yPos + 29)
    doc.text(`Reference: ${invoice.invoice_number}`, 110, yPos + 14)
    doc.text('Account Type: Current', 110, yPos + 19)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Please use the invoice number as your payment reference', 105, 280, { align: 'center' })
    doc.text('Thank you for choosing NannyGold Professional Services', 105, 285, { align: 'center' })

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer')

    // Upload to Supabase Storage
    const fileName = `${invoice.invoice_number}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('invoice-pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('invoice-pdfs')
      .getPublicUrl(fileName)

    return new Response(
      JSON.stringify({ pdf_url: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ PDF generation error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: error.code,
        details: error.details 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
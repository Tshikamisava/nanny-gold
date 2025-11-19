import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

async function sendEmailWithRetry(
  resend: any,
  emailData: any,
  maxRetries = 3
): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send(emailData);
      console.log(`✅ Email sent successfully on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Email send failed on attempt ${attempt}:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { booking_id } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch booking details with client info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        clients!inner(
          id,
          home_size,
          children_ages,
          other_dependents
        )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError) {
      console.error('Booking fetch error:', bookingError)
      throw bookingError
    }

    // Fetch client profile with location
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, location')
      .eq('id', booking.client_id)
      .single()
    
    // Fetch nanny profile for booking details
    const { data: nannyProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', booking.nanny_id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      throw profileError
    }

    console.log('📋 Booking fetched:', booking)
    console.log('👤 Profile fetched:', profile)

    // Calculate invoice amount based on booking type
    let invoiceAmount = 0
    const lineItems: Array<{ description: string; amount: number }> = []

    if (booking.booking_type === 'long_term') {
      // Calculate placement fee using CORRECTED logic
      const homeSize = booking.clients?.home_size || booking.home_size || 'family_hub'
      const baseRate = booking.base_rate || 0

      console.log('🏠 Home size:', homeSize, 'Base rate:', baseRate)

      // Correct placement fee calculation (from Phase 1 fix)
      if (homeSize === 'grand_retreat' || homeSize === 'epic_estates') {
        invoiceAmount = Math.round(baseRate * 0.5) // 50% of base rate only
      } else {
        invoiceAmount = 2500 // Flat fee for smaller homes
      }

      // Use living arrangement instead of home size
      const livingArrangement = booking.living_arrangement === 'live_in' ? 'Live-In' : 'Live-Out';
      
      lineItems.push({
        description: `${livingArrangement} Nanny Placement Fee`,
        amount: invoiceAmount
      })

      console.log('💰 Calculated placement fee:', invoiceAmount)
    } else {
      // Short-term: full booking cost with explicit breakdown
      invoiceAmount = booking.total_monthly_cost || 0
      const bookingFee = 35
      const serviceCharges = invoiceAmount - bookingFee
      
      lineItems.push({
        description: 'Short-term Service Charges',
        amount: serviceCharges
      })
      lineItems.push({
        description: 'Booking Fee',
        amount: bookingFee
      })
    }

    // Generate shorter invoice number (13 characters)
    const now = new Date()
    const year = now.getFullYear().toString().slice(2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const sequence = Date.now().toString().slice(-4)
    const invoiceNumber = `INV-${year}${month}-${sequence}`

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        client_id: booking.client_id,
        booking_id: booking_id,
        amount: invoiceAmount,
        status: 'pending',
        due_date: new Date().toISOString(),
        issue_date: new Date().toISOString(),
        invoice_number: invoiceNumber,
        line_items: lineItems,
        notes: `
Payment Details:
Account Name: NannyGold
Bank: Capitec Business
Account Number: 1054131465
Branch Code: 450105
Account Type: Current
Reference: ${invoiceNumber}

Please use the invoice number as your payment reference.
        `.trim()
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError)
      throw invoiceError
    }

    console.log('✅ Invoice created:', invoice)

    // Send email with banking details
    const clientEmail = profile?.email
    const clientName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()

    if (clientEmail) {
      try {
        // Generate PDF attachment
        let pdfAttachment = null;
        try {
          const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', {
            body: { invoice_id: invoice.id }
          });
          
          if (!pdfError && pdfData?.pdf_url) {
            const pdfResponse = await fetch(pdfData.pdf_url);
            const pdfBuffer = await pdfResponse.arrayBuffer();
            pdfAttachment = {
              filename: `${invoiceNumber}.pdf`,
              content: Buffer.from(pdfBuffer).toString('base64'),
              type: 'application/pdf'
            };
          }
        } catch (error) {
          console.error('PDF generation failed:', error);
        }

        const emailResponse = await sendEmailWithRetry(resend, {
          from: 'NannyGold <donotreply@nannygold.co.za>',
          to: [clientEmail],
          subject: `Invoice ${invoiceNumber} - Payment Required`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Your NannyGold Invoice</h2>
              <p>Dear ${clientName},</p>
              <p>Your booking has been created successfully. Please find the invoice details below:</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount Due:</strong> R${invoiceAmount.toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-ZA')}</p>
              </div>
              
              <h3 style="color: #2563eb;">Banking Details</h3>
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Account Name:</strong> NannyGold</p>
                <p><strong>Bank:</strong> Capitec Business</p>
                <p><strong>Account Number:</strong> 1054131465</p>
                <p><strong>Branch Code:</strong> 450105</p>
                <p><strong>Account Type:</strong> Current</p>
                <p><strong>Reference:</strong> ${invoiceNumber}</p>
              </div>
              
              <p style="color: #dc2626;"><strong>Important:</strong> Please use the invoice number as your payment reference to ensure proper allocation.</p>
              
              <p>Once payment is confirmed, your booking will be activated and the nanny will be notified.</p>
              
              <p>Thank you for choosing NannyGold!</p>
            </div>
          `,
          attachments: pdfAttachment ? [pdfAttachment] : undefined
        }, 3)
        
        console.log('✅ Email sent successfully via Resend')
        console.log('✅ Resend Email ID:', emailResponse.id)
        console.log('✅ Sent to:', clientEmail)
        
        // Log email delivery
        await supabase.from('invoice_email_logs').insert({
          invoice_id: invoice.id,
          resend_email_id: emailResponse.id,
          recipient_email: clientEmail,
          delivery_status: 'sent'
        })
      } catch (emailError) {
        console.error('❌ Failed to send email via Resend:', emailError)
        
        // Log failed email
        await supabase.from('invoice_email_logs').insert({
          invoice_id: invoice.id,
          recipient_email: clientEmail,
          delivery_status: 'failed',
          bounce_reason: emailError.message
        })
        
        // Notify admins of email failure
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
        
        if (admins && admins.length > 0) {
          await supabase.from('notifications').insert(
            admins.map(admin => ({
              user_id: admin.user_id,
              title: 'Invoice Email Failed',
              message: `Failed to send invoice ${invoiceNumber} to ${clientEmail}. Invoice was created but email delivery failed.`,
              type: 'admin_alert',
              data: {
                invoice_id: invoice.id,
                booking_id: booking_id,
                client_email: clientEmail,
                error: emailError.message
              }
            }))
          )
        }
        
        // Don't fail invoice creation if email fails
      }
    }

    // Create notification for client
    await supabase
      .from('notifications')
      .insert({
        user_id: booking.client_id,
        title: 'Invoice Generated',
        message: `Your invoice ${invoiceNumber} for R${invoiceAmount.toFixed(2)} is ready. Please make payment within 7 days to activate your booking.`,
        type: 'invoice_created',
        data: {
          invoice_id: invoice.id,
          booking_id: booking_id,
          amount: invoiceAmount,
          invoice_number: invoiceNumber
        }
      })

    console.log('🔔 Notification created for client')

    return new Response(
      JSON.stringify({
        success: true,
        invoice,
        message: 'Invoice generated and email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Error generating invoice:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    
    // Notify admins of invoice generation failure
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
      
      if (admins && admins.length > 0) {
        await supabase.from('notifications').insert(
          admins.map(admin => ({
            user_id: admin.user_id,
            title: 'Invoice Generation Failed',
            message: `Failed to generate invoice. Error: ${error.message}`,
            type: 'admin_alert',
            data: {
              error: error.message,
              stack: error.stack
            }
          }))
        )
      }
    } catch (notifError) {
      console.error('❌ Failed to send admin notification:', notifError)
    }
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate invoice',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

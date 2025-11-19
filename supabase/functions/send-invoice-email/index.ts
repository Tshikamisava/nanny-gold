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
    const { invoice_id, delivery_method } = await req.json()

    if (!invoice_id || !delivery_method) {
      throw new Error('invoice_id and delivery_method are required')
    }

    if (!['email', 'app', 'both'].includes(delivery_method)) {
      throw new Error('delivery_method must be "email", "app", or "both"')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        bookings!inner(
          id,
          booking_type,
          living_arrangement,
          clients!inner(home_size)
        )
      `)
      .eq('id', invoice_id)
      .single()

    if (invoiceError) throw invoiceError

    // Fetch client profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', invoice.client_id)
      .single()

    if (profileError) throw profileError

    const clientEmail = profile.email
    const clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()

    // Map home size to display name
    const homeSize = invoice.bookings?.clients?.home_size || 'family_hub'
    const homeSizeDisplay = homeSize === 'pocket_palace' ? 'Pocket Palace' :
                            homeSize === 'family_hub' ? 'Family Hub' :
                            homeSize === 'grand_estate' ? 'Grand Estate' :
                            homeSize === 'monumental_manor' ? 'Monumental Manor' :
                            'Standard Home'

    // Format line items for email
    const lineItemsHtml = (invoice.line_items || []).map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">R${item.amount.toFixed(2)}</td>
      </tr>
    `).join('')

    console.log('📧 Preparing to send invoice:', invoice.invoice_number, 'via', delivery_method)

    // Send in-app notification if needed
    if (delivery_method === 'app' || delivery_method === 'both') {
      await supabase
        .from('notifications')
        .insert({
          user_id: invoice.client_id,
          title: 'Invoice Available',
          message: `Your invoice ${invoice.invoice_number} for R${invoice.amount.toFixed(2)} is ready to view. Please review and make payment.`,
          type: 'invoice_available',
          data: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            amount: invoice.amount,
            due_date: invoice.due_date
          }
        })
      console.log('✅ In-app notification created')
    }

    // Send email if needed
    if (delivery_method === 'email' || delivery_method === 'both') {
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
              filename: `${invoice.invoice_number}.pdf`,
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
          subject: `Invoice ${invoice.invoice_number} - Payment Required`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Your NannyGold Invoice</h2>
              <p>Dear ${clientName},</p>
              <p>Your invoice is ready for payment. Please find the details below:</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Issue Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString('en-ZA')}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-ZA')}</p>
                <p><strong>Status:</strong> ${invoice.status}</p>
              </div>
              
              <h3 style="color: #2563eb;">Invoice Details</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #d1d5db;">Description</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d1d5db;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHtml}
                  <tr style="background: #f3f4f6; font-weight: bold;">
                    <td style="padding: 10px;">Total Amount</td>
                    <td style="padding: 10px; text-align: right;">R${invoice.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              
              <h3 style="color: #2563eb;">Banking Details</h3>
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Account Name:</strong> NannyGold</p>
                <p><strong>Bank:</strong> Capitec Business</p>
                <p><strong>Account Number:</strong> 1054131465</p>
                <p><strong>Branch Code:</strong> 450105</p>
                <p><strong>Account Type:</strong> Current</p>
                <p><strong>Reference:</strong> ${invoice.invoice_number}</p>
              </div>
              
              <p style="color: #dc2626;"><strong>Important:</strong> Please use the invoice number as your payment reference to ensure proper allocation.</p>
              
              <p>You can also view and pay this invoice online by logging into your NannyGold account.</p>
              
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
              message: `Failed to send invoice ${invoice.invoice_number} to ${clientEmail}. Error: ${emailError.message}`,
              type: 'admin_alert',
              data: {
                invoice_id: invoice.id,
                client_email: clientEmail,
                error: emailError.message
              }
            }))
          )
        }
        
        throw new Error(`Email delivery failed: ${emailError.message}`)
      }
    }

    // Update invoice tracking
    const updateData: any = {
      email_sent_count: (invoice.email_sent_count || 0) + 1,
      last_email_sent_to: clientEmail,
      updated_at: new Date().toISOString()
    }

    if (delivery_method === 'email' || delivery_method === 'both') {
      updateData.email_sent_at = new Date().toISOString()
    }

    await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id)

    console.log('✅ Invoice tracking updated')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invoice sent successfully via ${delivery_method}`,
        invoice_number: invoice.invoice_number,
        sent_to: clientEmail,
        delivery_method
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Error sending invoice:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send invoice',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

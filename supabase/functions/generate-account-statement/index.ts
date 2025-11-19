import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'
import jsPDF from 'npm:jspdf@2.5.2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { client_id, start_date, end_date } = await req.json()

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

    // Fetch client profile
    const { data: client } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', client_id)
      .single()

    // Fetch invoices
    let query = supabaseClient
      .from('invoices')
      .select('*')
      .eq('client_id', client_id)
      .order('issue_date', { ascending: true })

    if (start_date) query = query.gte('issue_date', start_date)
    if (end_date) query = query.lte('issue_date', end_date)

    const { data: invoices } = await query

    // Create PDF
    const doc = new jsPDF()

    // Header
    doc.setFontSize(24)
    doc.setTextColor(37, 99, 235)
    doc.text('NannyGold', 20, 20)

    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Account Statement', 20, 30)

    // Client info
    doc.setFontSize(10)
    doc.text(`${client.first_name} ${client.last_name}`, 20, 40)
    doc.text(client.email, 20, 45)
    doc.text(`Period: ${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`, 20, 50)

    // Summary stats
    const totalAmount = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0
    const totalPaid = invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0) || 0
    const totalPending = totalAmount - totalPaid

    doc.setFillColor(240, 240, 240)
    doc.rect(20, 60, 170, 25, 'F')
    doc.setFontSize(10)
    doc.text(`Total Invoiced: R${totalAmount.toFixed(2)}`, 25, 68)
    doc.text(`Total Paid: R${totalPaid.toFixed(2)}`, 25, 75)
    doc.text(`Outstanding: R${totalPending.toFixed(2)}`, 25, 82)

    // Invoice table
    let yPos = 95
    doc.setFontSize(9)
    doc.text('Date', 20, yPos)
    doc.text('Invoice #', 50, yPos)
    doc.text('Amount', 110, yPos)
    doc.text('Status', 150, yPos)
    doc.line(20, yPos + 2, 190, yPos + 2)

    yPos += 8
    invoices?.forEach((invoice) => {
      doc.text(new Date(invoice.issue_date).toLocaleDateString(), 20, yPos)
      doc.text(invoice.invoice_number, 50, yPos)
      doc.text(`R${invoice.amount.toFixed(2)}`, 110, yPos)
      doc.text(invoice.status, 150, yPos)
      yPos += 6

      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
    })

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer')

    // Upload to storage
    const fileName = `statement-${client_id}-${Date.now()}.pdf`
    const { data: uploadData } = await supabaseClient.storage
      .from('invoice-pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

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
    console.error('Statement generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
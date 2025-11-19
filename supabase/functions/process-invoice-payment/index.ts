import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { invoice_id } = await req.json();

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Get client's default payment method
    const { data: paymentMethod, error: paymentError } = await supabaseClient
      .from('client_payment_methods')
      .select('*')
      .eq('client_id', invoice.client_id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (paymentError || !paymentMethod) {
      throw new Error('No active payment method found');
    }

    // Process payment with Paystack
    const paystackResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_code: paymentMethod.paystack_authorization_code,
        email: invoice.client_id, // Should be email from profiles
        amount: invoice.amount * 100, // Convert to cents
        currency: invoice.currency || 'ZAR',
        reference: `inv_${invoice.invoice_number}_${Date.now()}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message);
    }

    // Update invoice status
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        payment_reference: paystackData.data.reference,
        payment_method: 'card'
      })
      .eq('id', invoice_id);

    if (updateError) throw updateError;

    // Update notification that payment was processed
    await supabaseClient
      .from('client_invoice_notifications')
      .update({ payment_processed_at: new Date().toISOString() })
      .eq('invoice_id', invoice_id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment processed successfully',
      reference: paystackData.data.reference
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing invoice payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
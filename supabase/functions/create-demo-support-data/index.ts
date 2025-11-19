import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Creating demo support data...');

    // Create demo support tickets
    const demoTickets = [
      {
        user_id: '00000000-0000-0000-0000-000000000001', // Demo user ID
        subject: 'Nanny availability issue',
        description: 'My regular nanny is not available this week. Need backup options.',
        category: 'booking',
        priority: 'high',
        status: 'open'
      },
      {
        user_id: '00000000-0000-0000-0000-000000000002',
        subject: 'Payment processing error',
        description: 'My payment failed but I was still charged. Please help resolve.',
        category: 'payment',
        priority: 'urgent',
        status: 'in_progress'
      },
      {
        user_id: '00000000-0000-0000-0000-000000000003',
        subject: 'Profile verification delay',
        description: 'My nanny profile has been pending verification for 3 days.',
        category: 'technical',
        priority: 'medium',
        status: 'open'
      },
      {
        user_id: '00000000-0000-0000-0000-000000000001',
        subject: 'Bespoke childcare arrangement',
        description: 'Need specialized care for child with diverse abilities. Require custom arrangement.',
        category: 'bespoke_arrangement',
        priority: 'medium',
        status: 'resolved',
        resolved_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      }
    ];

    // Insert demo tickets
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .insert(demoTickets)
      .select();

    if (ticketError) throw ticketError;

    // Create demo disputes
    const demoDisputes = [
      {
        booking_id: '11111111-1111-1111-1111-111111111111',
        raised_by: '00000000-0000-0000-0000-000000000001',
        dispute_type: 'service_quality',
        description: 'Nanny arrived late and left early without notification.',
        priority: 'high',
        status: 'pending'
      },
      {
        booking_id: '22222222-2222-2222-2222-222222222222',
        raised_by: '00000000-0000-0000-0000-000000000002',
        dispute_type: 'payment_dispute',
        description: 'Charged for extra hours that were not worked.',
        priority: 'medium',
        status: 'investigating'
      }
    ];

    // Insert demo disputes
    const { data: disputeData, error: disputeError } = await supabase
      .from('disputes')
      .insert(demoDisputes)
      .select();

    if (disputeError) throw disputeError;

    // Create demo chat messages for tickets
    if (ticketData && ticketData.length > 0) {
      const demoMessages = [
        {
          ticket_id: ticketData[0].id,
          sender_id: '00000000-0000-0000-0000-000000000001',
          message: 'Hi, I really need help with this urgently as I have work tomorrow.',
          is_internal: false
        },
        {
          ticket_id: ticketData[0].id,
          sender_id: 'admin-user-id',
          message: 'Thank you for contacting us. We are looking into backup nanny options for you right now.',
          is_internal: false
        },
        {
          ticket_id: ticketData[1].id,
          sender_id: '00000000-0000-0000-0000-000000000002',
          message: 'This is very frustrating. I need this resolved immediately.',
          is_internal: false
        }
      ];

      const { error: messageError } = await supabase
        .from('support_chat_messages')
        .insert(demoMessages);

      if (messageError) console.error('Error creating demo messages:', messageError);
    }

    // Create demo FAQ articles
    const demoFAQs = [
      {
        question: 'How do I change my booking?',
        answer: 'You can modify your booking up to 24 hours in advance through your dashboard. Go to "My Bookings" and click "Modify" next to your booking.',
        category: 'booking',
        keywords: ['booking', 'change', 'modify', 'reschedule'],
        is_active: true,
        auto_response_enabled: true
      },
      {
        question: 'What if my nanny is late or doesn\'t show up?',
        answer: 'If your nanny is more than 15 minutes late, please contact our emergency support line. We will arrange a backup nanny if needed.',
        category: 'emergency',
        keywords: ['late', 'no show', 'emergency', 'backup'],
        is_active: true,
        auto_response_enabled: true
      },
      {
        question: 'How are payments processed?',
        answer: 'Payments are automatically processed on the 1st of each month for recurring bookings. One-time bookings are charged immediately after service completion.',
        category: 'payment',
        keywords: ['payment', 'billing', 'charge', 'automatic'],
        is_active: true,
        auto_response_enabled: false
      }
    ];

    const { error: faqError } = await supabase
      .from('faq_articles')
      .insert(demoFAQs);

    if (faqError) console.error('Error creating demo FAQs:', faqError);

    console.log('Demo data created successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo support data created successfully',
      created: {
        tickets: ticketData?.length || 0,
        disputes: disputeData?.length || 0,
        faqs: demoFAQs.length
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in create-demo-support-data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
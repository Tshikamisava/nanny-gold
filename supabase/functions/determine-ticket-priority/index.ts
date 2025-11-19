import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketData {
  subject: string;
  description: string;
  category: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, description, category, user_id }: TicketData = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Determining ticket priority for:', { subject, category });

    // Priority determination logic
    let priority = 'medium'; // default
    let autoEscalationReason = '';

    const subjectLower = subject.toLowerCase();
    const descriptionLower = description.toLowerCase();
    const content = `${subjectLower} ${descriptionLower}`;

    // URGENT Priority Triggers
    const urgentKeywords = [
      'emergency', 'urgent', 'immediate', 'asap', 'critical', 'safety',
      'child hurt', 'accident', 'medical', 'hospital', 'danger',
      'locked out', 'no show', 'abandoned', 'lost', 'missing',
      'fraud', 'scam', 'stolen', 'unauthorized charge'
    ];

    // HIGH Priority Triggers  
    const highKeywords = [
      'payment failed', 'card declined', 'overcharged', 'billing error',
      'nanny late', 'no call no show', 'unprofessional', 'complaint',
      'refund', 'dispute', 'dissatisfied', 'angry', 'terrible',
      'lawsuit', 'legal', 'police', 'report'
    ];

    // LOW Priority Triggers
    const lowKeywords = [
      'question', 'how to', 'information', 'general inquiry',
      'feedback', 'suggestion', 'feature request', 'update profile'
    ];

    // Category-based priority adjustments
    const categoryPriorityMap: Record<string, string> = {
      'emergency': 'urgent',
      'payment': 'high', 
      'dispute': 'high',
      'bespoke_arrangement': 'medium',
      'technical': 'medium',
      'booking': 'medium',
      'general': 'low'
    };

    // Check for urgent keywords
    if (urgentKeywords.some(keyword => content.includes(keyword))) {
      priority = 'urgent';
      autoEscalationReason = 'Contains emergency/safety keywords';
    }
    // Check for high priority keywords
    else if (highKeywords.some(keyword => content.includes(keyword))) {
      priority = 'high';
      autoEscalationReason = 'Contains complaint/payment issue keywords';
    }
    // Check for low priority keywords
    else if (lowKeywords.some(keyword => content.includes(keyword))) {
      priority = 'low';
    }
    // Use category-based priority if no keywords match
    else if (categoryPriorityMap[category]) {
      priority = categoryPriorityMap[category];
      autoEscalationReason = `Category-based: ${category}`;
    }

    // Special escalation rules
    const escalationRules = [];

    // VIP Customer check (if user_id provided)
    if (user_id) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id);

      if (userRoles?.some(r => r.role === 'admin')) {
        priority = 'high';
        escalationRules.push('VIP user (admin)');
      }
    }

    // Repeat issue check
    if (user_id) {
      const { data: recentTickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user_id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(3);

      if (recentTickets && recentTickets.length >= 3) {
        if (priority === 'low') priority = 'medium';
        if (priority === 'medium') priority = 'high';
        escalationRules.push('Repeat customer (3+ tickets this week)');
      }
    }

    // Business hours check - escalate if outside hours
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isBusinessHours = !isWeekend && hour >= 8 && hour <= 17;

    if (!isBusinessHours && priority === 'urgent') {
      escalationRules.push('After-hours urgent ticket');
    }

    // Financial impact keywords
    const financialKeywords = ['money', 'payment', 'charge', 'bill', 'invoice', 'refund'];
    if (financialKeywords.some(keyword => content.includes(keyword)) && priority === 'medium') {
      priority = 'high';
      escalationRules.push('Financial impact detected');
    }

    console.log('Priority determination result:', {
      originalPriority: 'medium',
      finalPriority: priority,
      escalationReason: autoEscalationReason,
      escalationRules,
      triggeredKeywords: urgentKeywords.filter(k => content.includes(k))
    });

    return new Response(JSON.stringify({ 
      priority,
      autoEscalationReason,
      escalationRules,
      reasoning: {
        category,
        triggeredKeywords: [
          ...urgentKeywords.filter(k => content.includes(k)),
          ...highKeywords.filter(k => content.includes(k)),
          ...lowKeywords.filter(k => content.includes(k))
        ],
        isBusinessHours,
        analysisComplete: true
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in determine-ticket-priority:", error);
    return new Response(
      JSON.stringify({ 
        priority: 'medium', // fallback
        error: error.message,
        autoEscalationReason: 'Error in priority determination - defaulted to medium'
      }),
      {
        status: 200, // Still return success with fallback
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
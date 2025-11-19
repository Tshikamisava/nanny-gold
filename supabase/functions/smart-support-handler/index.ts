import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartSupportRequest {
  userQuery: string;
  userType?: string;
  ticketId?: string;
  context?: any;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Kelello AI Smart Support Handler Activated');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Request received:', requestBody);
    
    const { userQuery, userType, ticketId, context } = requestBody as SmartSupportRequest;
    
    if (!userQuery) {
      console.error('No userQuery provided');
      return new Response(
        JSON.stringify({ error: 'userQuery is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Kelello AI: Starting analysis of user query...');
    
    // **KELELLO AI STEP 1: PRIVATE REASONING - Understand User Intent & Emotion**
    const queryLower = userQuery.toLowerCase();
    
    // Enhanced emotional tone detection with intensity
    const emotionalAnalysis = {
      frustrated: ['frustrated', 'annoyed', 'angry', 'upset', 'mad', 'irritated', 'furious', 'pissed', 'hate'],
      urgent: ['urgent', 'emergency', 'asap', 'immediately', 'now', 'quick', 'fast', 'right away', 'help me now'],
      confused: ['confused', 'don\'t understand', 'unclear', 'help me understand', 'what does', 'how do', 'explain'],
      dissatisfied: ['unhappy', 'dissatisfied', 'not happy', 'disappointed', 'terrible', 'awful', 'bad experience', 'worst', 'horrible'],
      grateful: ['thank you', 'thanks', 'appreciate', 'grateful', 'helpful', 'amazing', 'great', 'wonderful'],
      satisfied: ['perfect', 'exactly', 'that\'s right', 'good', 'ok', 'okay', 'yes', 'correct', 'right', 'awesome', 'excellent'],
      farewell: ['bye', 'goodbye', 'see you', 'talk later', 'that\'s all', 'nothing else', 'no more', 'all good', 'i\'m good'],
      emergency: ['emergency', 'hurt', 'injured', 'medical', 'ambulance', 'hospital', 'danger', 'accident', 'bleeding', 'unconscious'],
      sad: ['sad', 'crying', 'upset', 'depressed', 'heartbroken', 'devastated'],
      worried: ['worried', 'concerned', 'anxious', 'nervous', 'scared', 'afraid']
    };

    let detectedTone = 'calm';
    let emotionalIntensity = 1; // 1-5 scale
    
    for (const [emotion, keywords] of Object.entries(emotionalAnalysis)) {
      const matchCount = keywords.filter(keyword => queryLower.includes(keyword)).length;
      if (matchCount > 0) {
        detectedTone = emotion;
        emotionalIntensity = Math.min(5, matchCount + 1);
        break;
      }
    }

        // Intent analysis - what does the user actually want?
        let primaryIntent = 'general_inquiry';
        let dbCategory = 'general'; // Default database category
        
        if (queryLower.includes('cancel') || queryLower.includes('refund')) {
          primaryIntent = 'cancellation';
          dbCategory = 'bookings';
        } else if (queryLower.includes('payment') || queryLower.includes('pay') || queryLower.includes('charge') || queryLower.includes('fees')) {
          primaryIntent = 'payment_issue';
          dbCategory = 'payments';
        } else if ((queryLower.includes('nanny') || queryLower.includes('caregiver')) && 
                   (queryLower.includes('bad') || queryLower.includes('problem') || queryLower.includes('dissatisfied'))) {
          primaryIntent = 'nanny_complaint';
          dbCategory = 'profiles';
        } else if (queryLower.includes('book') || queryLower.includes('schedule')) {
          primaryIntent = 'booking_help';
          dbCategory = 'bookings';
        } else if (queryLower.includes('match') || queryLower.includes('find')) {
          primaryIntent = 'matching_help';
          dbCategory = 'nanny_matching';
        } else if (queryLower.includes('service') || queryLower.includes('add')) {
          primaryIntent = 'service_inquiry';
          dbCategory = 'services';
        } else if (queryLower.includes('emergency') || queryLower.includes('urgent')) {
          primaryIntent = 'emergency_support';
          dbCategory = 'emergency';
        } else if (queryLower.includes('diverse ability')) {
          primaryIntent = 'special_needs_inquiry';
          dbCategory = 'special_needs';
        }

    console.log(`Kelello AI Analysis: Tone=${detectedTone}, Intensity=${emotionalIntensity}, Intent=${primaryIntent}`);

    // **KELELLO AI STEP 2: INTELLIGENT FAQ MATCHING**
    const { data: faqs, error: faqError } = await supabase
      .from('faq_articles')
      .select('*')
      .eq('is_active', true)
      .eq('auto_response_enabled', true);

    if (faqError) {
      console.error('Error fetching FAQs:', faqError);
      throw faqError;
    }

    console.log(`Kelello AI: Analyzing ${faqs?.length || 0} FAQs for intelligent matching...`);

    let bestMatch: any = null;
    let bestScore = 0;
    const threshold = 0.25; // Optimized threshold

    if (faqs && faqs.length > 0) {
      for (const faq of faqs) {
        let score = 0;
        const questionLower = faq.question.toLowerCase();
        
        // 1. Exact phrase matching (highest priority)
        const queryPhrases = queryLower.split(/[.,!?;]/).map(p => p.trim()).filter(p => p.length > 3);
        const questionPhrases = questionLower.split(/[.,!?;]/).map(p => p.trim()).filter(p => p.length > 3);
        
        for (const queryPhrase of queryPhrases) {
          for (const questionPhrase of questionPhrases) {
            if (queryPhrase.includes(questionPhrase) || questionPhrase.includes(queryPhrase)) {
              score += 1.0;
            }
          }
        }
        
        // 2. Advanced keyword matching
        if (faq.keywords && Array.isArray(faq.keywords)) {
          for (const keyword of faq.keywords) {
            const keywordLower = keyword.toLowerCase();
            if (queryLower.includes(keywordLower)) {
              score += 0.7;
              // Bonus for multiple occurrences
              const occurrences = (queryLower.match(new RegExp(keywordLower, 'g')) || []).length;
              score += (occurrences - 1) * 0.2;
            }
            // Partial matching for related terms
            if (keywordLower.length > 4) {
              const keywordRoot = keywordLower.substring(0, keywordLower.length - 2);
              if (queryLower.includes(keywordRoot)) {
                score += 0.3;
              }
            }
          }
        }
        
        // 3. Intent-based category alignment (using actual FAQ categories)
        const categoryAlignments = {
          'nanny_matching': ['matching', 'process', 'find', 'select', 'profiles'],
          'services': ['services', 'tutoring', 'play', 'bedtime', 'housework', 'tasks', 'add', 'additional'],
          'safety': ['screened', 'background', 'verify', 'references', 'safe', 'checked'],
          'payments': ['placement', 'fees', 'cost', 'pay', 'payment', 'card', 'monthly'],
          'bookings': ['cancel', 'change', 'modify', 'book', 'schedule', 'appointment'],
          'support': ['emergency', 'hotline', 'urgent', 'support', 'chat', 'help'],
          'emergency': ['emergency', 'urgent', 'hotline'],
          'coverage': ['coverage', 'area', 'location', 'city'],
          'profiles': ['profile', 'nanny', 'caregiver', 'experience'],
          'preferences': ['preferences', 'requirements', 'needs'],
          'replacement': ['replacement', 'backup', 'substitute'],
          'special_needs': ['diverse ability', 'disabilities', 'autism', 'medical']
        };
        
        const categoryWords = categoryAlignments[faq.category] || [];
        for (const catWord of categoryWords) {
          if (queryLower.includes(catWord)) {
            score += 0.5;
          }
        }
        
        // 4. Semantic similarity (word overlap with intelligent weighting)
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
        const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3);
        const commonWords = queryWords.filter(word => 
          questionWords.some(qw => qw.includes(word) || word.includes(qw))
        );
        score += (commonWords.length / Math.max(queryWords.length, questionWords.length)) * 0.4;
        
        console.log(`FAQ "${faq.question.substring(0, 50)}..." scored: ${score.toFixed(2)}`);
        
        if (score > bestScore && score >= threshold) {
          bestScore = score;
          bestMatch = faq;
        }
      }
    }

    console.log(`Kelello AI: Best match - "${bestMatch?.question || 'None'}" with confidence: ${bestScore.toFixed(2)}`);

    // **KELELLO AI STEP 3: EMPATHETIC RESPONSE GENERATION**
    let responseStrategy = 'general_support';
    let escalationLevel = 'none';
    let autoResponse = '';

    // Emergency detection - ABSOLUTE highest priority
    if (detectedTone === 'emergency' || queryLower.includes('emergency') || queryLower.includes('medical')) {
      responseStrategy = 'emergency_escalation';
      escalationLevel = 'immediate';
      autoResponse = "🚨 I understand this is an emergency situation and I'm taking this very seriously. Please use the 'Emergency Hotlines' button in the app immediately for urgent assistance, or contact emergency services directly if needed. I'm also connecting you with our Admin Angel right away for immediate support.";
    }
    // FAQ match found - provide helpful, empathetic answer
    else if (bestMatch && bestScore >= threshold) {
      responseStrategy = 'faq_auto_response';
      escalationLevel = (detectedTone === 'frustrated' || detectedTone === 'dissatisfied') ? 'low' : 'none';
      
      // Generate empathetic response based on emotional tone
      let empathyPrefix = '';
      let helpfulClosing = '';
      
      switch (detectedTone) {
        case 'frustrated':
          empathyPrefix = "Oh, I totally get why you'd be frustrated about this! Let me help sort this out for you right away. ";
          helpfulClosing = "\n\nI really want to make sure this gets resolved properly for you. If you'd like, I can also get you connected with one of our lovely Admin Angels for some extra personal support - they're amazing at handling these situations!";
          break;
        case 'confused':
          empathyPrefix = "No worries at all - this stuff can definitely be a bit confusing! Let me break this down in a way that hopefully makes everything crystal clear. ";
          helpfulClosing = "\n\nDoes that help clear things up? I'm always happy to explain things differently if needed, or I can connect you with our Admin Angel if you'd prefer to chat with a human about it!";
          break;
        case 'dissatisfied':
          empathyPrefix = "I'm really sorry to hear you've had this experience - that's definitely not the level of service we aim for. Let me see how I can help make this right. ";
          helpfulClosing = "\n\nYour satisfaction is genuinely important to us, and I'd love to connect you with our Admin Angel who can dive deeper into this and make sure we get everything sorted out properly.";
          escalationLevel = 'low'; // Always offer human support for dissatisfied users
          break;
        case 'worried':
          empathyPrefix = "I can understand why you'd be concerned about this - it's completely natural to want reassurance when it comes to childcare. Let me share some information that should help put your mind at ease. ";
          helpfulClosing = "\n\nI hope that helps address your concerns! Is there anything specific you'd like me to elaborate on?";
          break;
        case 'grateful':
          empathyPrefix = "Aw, you're so welcome! I'm genuinely happy I could help you out. ";
          helpfulClosing = "\n\nIs there anything else I can help you with while we're chatting?";
          break;
        default:
          empathyPrefix = "Great question! I'm here to help with that. ";
          helpfulClosing = "\n\nHope this helps! Feel free to ask if you need any clarification or have other questions.";
      }
      
      autoResponse = empathyPrefix + bestMatch.answer + helpfulClosing;
      
      // Update FAQ view count
      await supabase
        .from('faq_articles')
        .update({ view_count: (bestMatch.view_count || 0) + 1 })
        .eq('id', bestMatch.id);
    }
    // Handle satisfied/farewell users - no escalation needed
    else if (detectedTone === 'satisfied' || detectedTone === 'grateful' || detectedTone === 'farewell') {
      responseStrategy = 'satisfaction_response';
      escalationLevel = 'none';
      
      let closingResponse = '';
      if (detectedTone === 'farewell') {
        closingResponse = "Aww, thank you so much for chatting with me today! 🌟 It's been a pleasure helping you out. Feel free to pop back anytime you need anything with your childcare needs - I'll be right here waiting to help! Take care and have an absolutely wonderful day! 👋✨";
      } else if (detectedTone === 'satisfied') {
        closingResponse = "Yes! I'm absolutely thrilled I could help you get that sorted! 🎉 Your happiness genuinely makes my day. Don't hesitate to reach out anytime you need anything else - I'm always excited to help! Hope you have an amazing rest of your day! 😊💕";
      } else { // grateful
        closingResponse = "Aww, you're making me smile! 🥰 It's honestly my pleasure - I love being able to help with your childcare journey. I'm always here whenever you need a hand with anything, so don't be a stranger! Have the most wonderful day ahead! ✨💫";
      }
      
      autoResponse = closingResponse;
    }
    // No FAQ match - provide helpful response but assess if escalation is needed
    else {
      // Check if user is just greeting or making general conversation
      const isGreeting = queryLower.includes('hi') || queryLower.includes('hello') || 
                        queryLower.includes('hey') || queryLower.includes('good morning') ||
                        queryLower.includes('good afternoon') || queryLower.includes('good evening') ||
                        queryLower === 'hi there' || queryLower.length < 15; // Very short messages are likely greetings
      
      const needsHelp = !isGreeting && (primaryIntent !== 'general_inquiry' || 
                       detectedTone === 'frustrated' || 
                       detectedTone === 'confused' || 
                       detectedTone === 'worried' ||
                       detectedTone === 'dissatisfied');
      
      if (isGreeting || (!needsHelp && queryLower.length < 50)) {
        // Greetings and short, general messages - provide friendly response without escalation
        responseStrategy = 'friendly_chat';
        escalationLevel = 'none';
        autoResponse = "Hey there! 😊 I'm Kelello, your friendly AI assistant here at NannyGold! I'm absolutely buzzing to help you with anything related to nanny services, bookings, or any childcare questions you might have. What's on your mind today? I'm all ears! 🌟";
      } else {
        // User likely needs specific help - escalate appropriately
        responseStrategy = 'human_escalation';
        escalationLevel = 'low';
        
        let empathyPrefix = '';
        if (detectedTone === 'frustrated') {
          empathyPrefix = "Oh no, I can hear the frustration in your message, and honestly, I don't blame you at all! 😔 Let me get you exactly the help you deserve. ";
        } else if (detectedTone === 'confused') {
          empathyPrefix = "Hey, no worries! I totally understand the confusion - sometimes this stuff can be a bit overwhelming. Let me make sure I get you the clearest, most helpful information possible. ";
        } else if (detectedTone === 'worried') {
          empathyPrefix = "I can sense you're a bit worried about this, which is completely understandable - especially when it comes to something as important as childcare! Let me get you the reassurance and detailed answers you need. ";
        } else {
          empathyPrefix = "You know what? I want to make absolutely sure you get the most helpful and personalized assistance possible for this. ";
        }
        
        // Provide closest relevant guidance based on intent
        let relevantGuidance = '';
        switch (primaryIntent) {
          case 'cancellation':
            relevantGuidance = "For cancellation stuff, I'll connect you directly with our amazing Admin Angel who can look at your specific situation and walk you through everything step by step. ";
            break;
          case 'payment_issue':
            relevantGuidance = "For payment questions, our Admin Angel can dive into your account details and sort out exactly what's going on. ";
            break;
          case 'nanny_complaint':
            relevantGuidance = "For any concerns about nanny services, our Admin Angel will jump on this immediately and make sure we get your experience back on track where it should be. ";
            break;
          case 'booking_help':
            relevantGuidance = "For booking assistance, our Admin Angel can guide you through the whole process and make sure everything gets set up perfectly for you. ";
            break;
          case 'matching_help':
            relevantGuidance = "For nanny matching questions, our Admin Angel can walk you through our whole process and help you find that perfect match for your family. ";
            break;
          default:
            relevantGuidance = "Our Admin Angel can give you that personalized, one-on-one assistance that'll really help with your specific situation. ";
        }
        
        autoResponse = empathyPrefix + relevantGuidance + "They're online right now and ready to help, so I'll get you connected immediately - no waiting around! 🚀";
      }
    }

    console.log(`Kelello AI: Generated ${responseStrategy} response with ${escalationLevel} escalation`);

    // **KELELLO AI STEP 4: CREATE SUPPORT INFRASTRUCTURE**
    let conversationId = ticketId;
    
    if (!conversationId) {
      console.log('Creating new support ticket...');
      const priority = escalationLevel === 'immediate' ? 'high' : 
                      (escalationLevel === 'low' || detectedTone === 'dissatisfied') ? 'medium' : 'low';
      
      const { data: newTicket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: context?.userProfile?.id || 'anonymous',
          subject: userQuery.substring(0, 100) + (userQuery.length > 100 ? '...' : ''),
          description: userQuery,
          priority: priority,
          status: escalationLevel === 'immediate' ? 'urgent' : 'open',
          category: dbCategory
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Error creating ticket:', ticketError);
        throw ticketError;
      }

      conversationId = newTicket.id;
      console.log(`Created ticket: ${conversationId} with priority: ${priority}`);
    }

    // Insert user message
    console.log('Logging user message...');
    const { error: userMessageError } = await supabase
      .from('support_chat_messages')
      .insert({
        ticket_id: conversationId,
        sender_id: context?.userProfile?.id || 'anonymous',
        message: userQuery,
        is_internal: false
      });

    if (userMessageError) {
      console.error('Error inserting user message:', userMessageError);
      throw userMessageError;
    }

    // Insert Kelello's response
    console.log('Inserting Kelello AI response...');
    const { error: systemMessageError } = await supabase
      .rpc('insert_system_chat_message', {
        p_ticket_id: conversationId,
        p_message: autoResponse,
        p_is_internal: false
      });

    if (systemMessageError) {
      console.error('Error inserting system message:', systemMessageError);
      throw systemMessageError;
    }

    // **KELELLO AI STEP 5: ESCALATION & NOTIFICATIONS**
    if (escalationLevel !== 'none') {
      console.log(`Processing ${escalationLevel} escalation...`);
      
      // Get admin users for notifications
      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (!adminError && adminRoles && adminRoles.length > 0) {
        // Create notifications for admins
        const notifications = adminRoles.map(admin => ({
          user_id: admin.user_id,
          title: escalationLevel === 'immediate' ? '🚨 URGENT: Emergency Support Request' : 
                 detectedTone === 'dissatisfied' ? '😟 Dissatisfied Customer Needs Attention' :
                 '💬 Support Request Needs Attention',
          message: escalationLevel === 'immediate' 
            ? `Emergency support request: "${userQuery.substring(0, 100)}..."`
            : `Customer needs assistance (${detectedTone}): "${userQuery.substring(0, 100)}..."`,
          type: escalationLevel === 'immediate' ? 'emergency_support' : 'support_escalation',
          data: {
            ticket_id: conversationId,
            escalation_level: escalationLevel,
            user_query: userQuery,
            detected_tone: detectedTone,
            emotional_intensity: emotionalIntensity,
            primary_intent: primaryIntent,
            ai_name: 'Kelello'
          }
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error creating notifications:', notificationError);
        } else {
          console.log(`Created ${notifications.length} admin notifications for ${escalationLevel} escalation`);
        }

        // Send email for urgent cases
        if (escalationLevel === 'immediate') {
          console.log('Sending urgent email notification...');
          try {
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            if (resendApiKey) {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'support@nannygold.co.za',
                  to: ['admin@nannygold.co.za'],
                  subject: '🚨 URGENT: Emergency Support Request - Kelello AI Alert',
                  html: `
                    <h2>🚨 Emergency Support Request - Kelello AI Alert</h2>
                    <p><strong>User Query:</strong> ${userQuery}</p>
                    <p><strong>Detected Tone:</strong> ${detectedTone} (Intensity: ${emotionalIntensity}/5)</p>
                    <p><strong>Primary Intent:</strong> ${primaryIntent}</p>
                    <p><strong>Ticket ID:</strong> ${conversationId}</p>
                    <p><strong>Kelello's Response:</strong> ${autoResponse.substring(0, 200)}...</p>
                    <p style="color: red; font-weight: bold;">Please respond immediately.</p>
                  `
                }),
              });
            }
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }
        }
      }
    }

    console.log('Kelello AI: Successfully processed support request');

    return new Response(JSON.stringify({
      success: true,
      conversationId,
      responseStrategy,
      escalationLevel,
      detectedTone,
      emotionalIntensity,
      primaryIntent,
      autoResponse,
      faqMatched: !!bestMatch,
      matchScore: bestScore,
      aiName: 'Kelello',
      escalationAvailable: escalationLevel !== 'none'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Kelello AI Error:', error);
    
    // Even in error cases, provide a helpful response
    const fallbackResponse = "I'm experiencing a technical issue right now, but I don't want to leave you without help. Let me connect you with our Admin Angel who can assist you immediately while I get back online.";
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Technical issue occurred',
      autoResponse: fallbackResponse,
      escalationLevel: 'low',
      responseStrategy: 'technical_fallback',
      aiName: 'Kelello',
      escalationAvailable: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
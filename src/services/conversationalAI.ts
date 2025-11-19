interface ConversationContext {
  userId?: string;
  userType: 'client' | 'nanny';
  previousMessages: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }>;
  sessionId: string;
}

interface IntentClassification {
  intent: string;
  confidence: number;
  entities: string[];
}

interface SemanticSearchResult {
  content: string;
  source: string;
  score: number;
  metadata?: any;
}

interface AIResponse {
  message: string;
  confidence: number;
  sources: SemanticSearchResult[];
  intent: IntentClassification;
  escalationNeeded: boolean;
  responseType: 'faq' | 'conversational' | 'search_result' | 'escalation';
}

class ConversationalAIService {
  private readonly intents = [
    'booking_help', 'payment_issue', 'nanny_complaint', 'cancellation',
    'matching_help', 'service_inquiry', 'emergency_support', 'general_inquiry',
    'diverse_ability', 'schedule_change', 'profile_help', 'technical_support',
    'booking_modification', 'nanny_replacement', 'modification_fees',
    'cooking_services', 'driving_services', 'special_needs_care', 'housekeeping',
    'verification_process', 'live_in_vs_live_out', 'emergency_care', 'rates_pricing',
    'training_education', 'communication_support', 'interview_process', 'backup_services'
  ];

  async initialize() {
    console.log('🤖 Conversational AI Service initialized');
    return true;
  }

  async processUserQuery(
    query: string, 
    context: ConversationContext
  ): Promise<AIResponse> {
    console.log('🤖 Processing user query:', query);
    console.log('🔄 Context:', context);
    
    // Enhanced keyword matching for better intent recognition
    const intent = this.classifyIntent(query);
    console.log('🧠 Classified intent:', intent);
    
    // Check for escalation keywords first - improved matching
    const escalationKeywords = [
      'human', 'agent', 'real person', 'admin angel', 'admin',
      'speak to', 'talk to', 'live chat', 'contact',
      'urgent help', 'not helpful', "can't help", 'frustrated', 'complaint',
      'escalate', 'supervisor', 'connect', 'talk to someone', 'speak with'
    ];
    
    console.log('🔍 Checking escalation for query:', query);
    const queryLower = query.toLowerCase();
    const foundKeywords = escalationKeywords.filter(keyword => queryLower.includes(keyword));
    console.log('🎯 Found escalation keywords:', foundKeywords);
    
    if (foundKeywords.length > 0) {
      console.log('🚨 Escalation triggered for query:', query);
      return {
        message: "I understand you'd like to speak with our Admin Angel team. I'll connect you right away!",
        confidence: 1.0,
        sources: [],
        intent: { intent: 'escalation', confidence: 1.0, entities: [] },
        escalationNeeded: true,
        responseType: 'escalation'
      };
    }

    // Enhanced contextual understanding - check conversation history
    const contextualIntent = this.analyzeContextualIntent(query, context, intent);
    
    // Enhanced FAQ matching with better responses
    const faqResponse = await this.searchFAQ(query, contextualIntent);
    if (faqResponse) {
      console.log('📚 FAQ response found:', faqResponse);
      return faqResponse;
    }

    // Generate conversational response based on intent
    console.log('💬 Generating conversational response for intent:', contextualIntent.intent);
    return this.generateConversationalResponse(query, contextualIntent, context);
  }

  private analyzeContextualIntent(
    query: string, 
    context: ConversationContext, 
    baseIntent: IntentClassification
  ): IntentClassification {
    const queryLower = query.toLowerCase();
    
    // Check if this is a follow-up question
    const recentMessages = context.previousMessages.slice(-3);
    const recentContext = recentMessages.map(m => m.message.toLowerCase()).join(' ');
    
    // Enhanced contextual understanding for all FAQ categories
    
    // Placement fee context - direct and indirect
    if (queryLower.includes('placement fee') || queryLower.includes('placement cost') || 
        (recentContext.includes('placement') && (queryLower.includes('fee') || queryLower.includes('cost') || queryLower.includes('price')))) {
      return {
        intent: 'placement_fees',
        confidence: 0.95,
        entities: ['placement_fee', 'context_aware']
      };
    }
    
    // Booking modification context
    if ((recentContext.includes('booking') || recentContext.includes('service')) && 
        (queryLower.includes('change') || queryLower.includes('modify') || queryLower.includes('add') || queryLower.includes('remove'))) {
      return {
        intent: 'booking_modification',
        confidence: 0.9,
        entities: ['booking', 'modification', 'context_aware']
      };
    }
    
    // Nanny replacement context
    if ((recentContext.includes('nanny') || recentContext.includes('not happy') || recentContext.includes('problem')) && 
        (queryLower.includes('different') || queryLower.includes('new') || queryLower.includes('change') || queryLower.includes('replace'))) {
      return {
        intent: 'nanny_replacement',
        confidence: 0.9,
        entities: ['nanny', 'replacement', 'context_aware']
      };
    }
    
    // Payment context
    if ((recentContext.includes('payment') || recentContext.includes('bill') || recentContext.includes('invoice')) && 
        (queryLower.includes('problem') || queryLower.includes('issue') || queryLower.includes('help') || queryLower.includes('error'))) {
      return {
        intent: 'payment_issue',
        confidence: 0.9,
        entities: ['payment', 'issue', 'context_aware']
      };
    }
    
    // Service-specific context
    if (recentContext.includes('cook') || recentContext.includes('meal') || recentContext.includes('food')) {
      if (queryLower.includes('cost') || queryLower.includes('price') || queryLower.includes('how much') || queryLower.includes('extra')) {
        return { intent: 'rates_pricing', confidence: 0.9, entities: ['cooking', 'pricing'] };
      }
      return { intent: 'cooking_services', confidence: 0.9, entities: ['cooking', 'context_aware'] };
    }
    
    if (recentContext.includes('drive') || recentContext.includes('transport') || recentContext.includes('school')) {
      if (queryLower.includes('cost') || queryLower.includes('price') || queryLower.includes('how much') || queryLower.includes('extra')) {
        return { intent: 'rates_pricing', confidence: 0.9, entities: ['driving', 'pricing'] };
      }
      return { intent: 'driving_services', confidence: 0.9, entities: ['driving', 'context_aware'] };
    }
    
    // Interview context
    if ((recentContext.includes('interview') || recentContext.includes('meet') || recentContext.includes('video call')) && 
        (queryLower.includes('schedule') || queryLower.includes('when') || queryLower.includes('how') || queryLower.includes('prepare'))) {
      return {
        intent: 'interview_process',
        confidence: 0.9,
        entities: ['interview', 'scheduling', 'context_aware']
      };
    }
    
    // Emergency context
    if ((recentContext.includes('urgent') || recentContext.includes('emergency') || recentContext.includes('asap')) && 
        (queryLower.includes('book') || queryLower.includes('need') || queryLower.includes('help') || queryLower.includes('now'))) {
      return {
        intent: 'emergency_care',
        confidence: 0.95,
        entities: ['emergency', 'booking', 'context_aware']
      };
    }
    
    // If user is asking follow-up questions about same topic, maintain intent
    if (context.previousMessages.length > 0) {
      const lastMessage = context.previousMessages[context.previousMessages.length - 1];
      if (lastMessage.sender === 'ai' && 
          (queryLower.includes('yes') || queryLower.includes('no') || queryLower.includes('tell me more') || 
           queryLower.includes('explain') || queryLower.includes('how') || queryLower.includes('what'))) {
        return {
          intent: baseIntent.intent,
          confidence: Math.min(0.95, baseIntent.confidence + 0.2),
          entities: [...baseIntent.entities, 'follow_up_question']
        };
      }
    }
    
    return baseIntent;
  }

  private classifyIntent(query: string): IntentClassification {
    const lowerQuery = query.toLowerCase();
    
    // Enhanced keyword sets for better classification
    const intentKeywords = {
      placement_fees: [
        'placement fee', 'placement cost', 'placement charge', 'one time fee',
        'initial fee', 'setup fee', 'registration fee', 'admin fee',
        'what does it cost', 'how much is placement', 'placement pricing'
      ],
      booking_help: [
        'book', 'booking', 'schedule', 'appointment', 'reserve', 'hire',
        'make booking', 'create booking', 'need nanny', 'find nanny'
      ],
      cancellation: [
        'cancel', 'cancellation', 'cancel booking', 'cancel appointment',
        'stop service', 'end booking', 'terminate', 'refund'
      ],
      schedule_change: [
        'change booking', 'modify booking', 'reschedule', 'update schedule',
        'change time', 'change date', 'different time', 'move booking'
      ],
      booking_modification: [
        'modify', 'modification', 'change booking', 'update booking', 'edit booking',
        'add service', 'remove service', 'change services', 'update services'
      ],
      modification_fees: [
        'modification fee', 'change fee', 'cost to modify', 'fees for changes',
        'how much to change', 'price to modify'
      ],
      nanny_replacement: [
        'change nanny', 'different nanny', 'new nanny', 'replace nanny',
        'switch nanny', 'another nanny'
      ],
      payment_issue: [
        'payment', 'pay', 'billing', 'invoice', 'charge', 'cost', 'price',
        'money', 'fee', 'credit card', 'bank', 'transaction'
      ],
      nanny_complaint: [
        'unhappy', 'not satisfied', 'complaint', 'problem with nanny',
        'different nanny', 'new nanny', 'replace nanny', 'not happy'
      ],
      matching_help: [
        'match', 'find', 'search', 'recommend', 'suggest', 'best nanny',
        'suitable nanny', 'right nanny', 'perfect nanny'
      ],
      emergency_support: [
        'emergency', 'urgent', 'asap', 'immediately', 'right now',
        'crisis', 'help now', 'emergency nanny'
      ],
      cooking_services: [
        'cooking', 'cook', 'meals', 'food prep', 'meal preparation', 'kitchen',
        'prepare food', 'chef', 'snacks', 'dinner', 'lunch', 'breakfast'
      ],
      driving_services: [
        'driving', 'drive', 'transportation', 'transport', 'school pickup',
        'school drop off', 'errands', 'car', 'license', 'chauffeur'
      ],
      special_needs_care: [
        'special needs', 'diverse ability', 'disabilities', 'therapy',
        'specialized care', 'autism', 'adhd', 'developmental', 'medical needs'
      ],
      housekeeping: [
        'housekeeping', 'cleaning', 'laundry', 'tidying', 'organize',
        'household', 'chores', 'house work', 'maintain'
      ],
      verification_process: [
        'verification', 'verify', 'background check', 'screening', 'documents',
        'police clearance', 'references', 'safety', 'approved'
      ],
      live_in_vs_live_out: [
        'live in', 'live out', 'accommodation', 'stay over', 'resident',
        'living arrangement', 'overnight', 'room', 'bedroom'
      ],
      emergency_care: [
        'emergency care', 'emergency booking', 'last minute', 'urgent care',
        'immediate help', 'asap care', 'crisis childcare'
      ],
      rates_pricing: [
        'rates', 'pricing', 'cost', 'fees', 'charges', 'price list',
        'how much', 'expensive', 'cheap', 'affordable'
      ],
      training_education: [
        'training', 'education', 'ecd', 'montessori', 'qualified',
        'certified', 'professional development', 'skills', 'experience'
      ],
      communication_support: [
        'communicate', 'contact', 'chat', 'message', 'support',
        'admin angel', 'help desk', 'customer service'
      ],
      interview_process: [
        'interview', 'meet', 'meeting', 'video call', 'questions',
        'compatibility', 'selection', 'choose'
      ],
      backup_services: [
        'backup', 'replacement', 'substitute', 'cover', 'alternative',
        'sick nanny', 'unavailable', 'temporary'
      ]
    };

    // Find best matching intent
    let bestIntent = 'general_inquiry';
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
      const score = matches.length / keywords.length;
      
      if (score > bestScore && matches.length > 0) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    console.log('🎯 Intent classification result:', { intent: bestIntent, confidence: bestScore });
    return {
      intent: bestIntent,
      confidence: Math.max(0.3, bestScore), // Minimum confidence
      entities: []
    };
  }

  private async searchFAQ(query: string, intent: IntentClassification): Promise<AIResponse | null> {
    // Enhanced FAQ matching with semantic understanding
    const faqs = {
      placement_fees: [
        {
          question: "What are placement fees?",
          answer: "Placement fees are one-time charges for finding and matching you with the perfect nanny. They cover our comprehensive vetting process, background checks, and matching services. The fee varies based on your specific requirements and the type of placement. Would you like to know the specific fee for your situation?"
        },
        {
          question: "How much is the placement fee?",
          answer: "Placement fees depend on several factors:\n• Service type (long-term vs short-term)\n• Specific requirements and services needed\n• Location and complexity of match\n\nFor a personalized quote, I can connect you with our team who will calculate the exact fee based on your needs. Would you like me to arrange that?"
        },
        {
          question: "When do I pay the placement fee?",
          answer: "The placement fee is typically paid upfront when you confirm your nanny selection, before services begin. This ensures we can complete all final preparations and formalities for your nanny placement."
        }
      ],
      booking_help: [
        {
          question: "How do I make a booking?",
          answer: "To make a booking:\n1. Complete your profile settings if you haven't already\n2. Go to your dashboard and click 'Find your perfect Nanny'\n3. Browse available services and nannies\n4. Select your preferred nanny and complete booking\n\nWould you like me to help you navigate to your dashboard?"
        },
        {
          question: "Can I book emergency care?",
          answer: "Yes! We offer emergency nanny services for urgent situations. Emergency bookings can be made through our platform and we'll find available nannies within your area as quickly as possible."
        }
      ],
      cancellation: [
        {
          question: "How do I cancel a booking?",
          answer: "To cancel a booking:\n1. Go to your Dashboard\n2. Find your active booking\n3. Click 'Modify Booking'\n4. Select 'Cancel Booking'\n5. Confirm cancellation\n\nNote: Cancellation fees may apply depending on timing. Would you like help with canceling a specific booking?"
        }
      ],
      booking_modification: [
        {
          question: "How do I modify my booking?",
          answer: "To modify your booking:\n1. Go to your Dashboard\n2. Find your booking under 'My Bookings'\n3. Click 'Request Modification'\n4. Choose what you want to change:\n   • Add/remove services\n   • Change schedule\n   • Update requirements\n5. Submit for approval\n\nMost changes are processed within 24-48 hours. What specifically would you like to modify?"
        },
        {
          question: "What can I change in my booking?",
          answer: "You can modify:\n• Additional services (cooking, driving, pet care)\n• Working hours and schedule\n• Special requirements or instructions\n• Number of children (with rate adjustment)\n• Duration of booking\n\nMajor changes like location or nanny replacement require special handling. What would you like to change?"
        }
      ],
      modification_fees: [
        {
          question: "Are there fees for modifications?",
          answer: "Modification fees depend on the type of change:\n• Service additions: No fee, just pay adjusted rate\n• Schedule changes (first 48hrs): Free\n• Major modifications: May include R150 processing fee\n• Emergency same-day changes: Additional fees apply\n\nWhat type of modification are you considering?"
        }
      ],
      nanny_replacement: [
        {
          question: "Can I change my nanny?",
          answer: "Yes! To request a nanny replacement:\n1. Go to your booking\n2. Select 'Request Replacement'\n3. Provide reason (compatibility, performance, schedule)\n4. We'll find a suitable replacement\n\nFirst replacement is free. Additional replacements may have fees. Would you like help with a replacement request?"
        }
      ],
      schedule_change: [
        {
          question: "How do I change my booking schedule?",
          answer: "To modify your booking:\n1. Go to your Dashboard\n2. Find your booking\n3. Click 'Modify Booking'\n4. Update your schedule or dates\n5. Submit for review\n\nChanges require approval and may affect pricing. Need help with a specific change?"
        }
      ],
      payment_issue: [
        {
          question: "Payment help",
          answer: "For payment issues:\n• Check your payment methods in Settings\n• Verify card details are current\n• Review invoices in your dashboard\n• Contact support for billing disputes\n\nWhat specific payment issue can I help with?"
        }
      ],
      nanny_complaint: [
        {
          question: "I'm not happy with my nanny",
          answer: "I understand your concerns. Here are your options:\n1. Request a replacement nanny through your dashboard\n2. Speak with our Admin Angel team for immediate assistance\n3. Report specific issues for investigation\n\nWe offer a satisfaction guarantee. Would you like me to connect you with our Admin Angel team?"
        }
      ]
    };

    const intentFaqs = faqs[intent.intent as keyof typeof faqs] || [];
    
    // Enhanced FAQ matching with semantic understanding
    let bestMatch = null;
    let bestScore = 0;
    
    for (const faq of intentFaqs) {
      const score = this.semanticMatch(query, faq.question, faq.answer);
      if (score > bestScore && score > 0.2) {
        bestScore = score;
        bestMatch = faq;
      }
    }
    
    // Also check cross-category if no good match found
    if (bestScore < 0.4) {
      for (const [categoryIntent, categoryFaqs] of Object.entries(faqs)) {
        if (categoryIntent !== intent.intent) {
          for (const faq of categoryFaqs) {
            const score = this.semanticMatch(query, faq.question, faq.answer);
            if (score > bestScore && score > 0.3) {
              bestScore = score;
              bestMatch = faq;
            }
          }
        }
      }
    }
    
    if (bestMatch) {
      console.log('📚 Matched FAQ:', bestMatch.question, 'Score:', bestScore);
      return {
        message: bestMatch.answer,
        confidence: Math.min(0.95, bestScore + 0.1),
        sources: [{ content: bestMatch.answer, source: 'FAQ', score: bestScore }],
        intent,
        escalationNeeded: false,
        responseType: 'faq'
      };
    }

    return null;
  }

  private generateConversationalResponse(
    query: string, 
    intent: IntentClassification, 
    context: ConversationContext
  ): AIResponse {
    console.log('💬 Generating response for intent:', intent.intent);
    
    // Enhanced conversational logic with unknown query handling
    if (intent.intent === 'general_inquiry' && intent.confidence < 0.4) {
      return this.handleUnknownQuery(query, context);
    }
    
    const responses = {
      placement_fees: [
        "Placement fees cover our comprehensive matching and vetting services. The exact amount depends on your specific needs and service type. Would you like me to explain how the fee is calculated or connect you with our team for a personalized quote?",
        "I understand you're asking about placement fees. These are one-time charges that cover finding, vetting, and matching you with the perfect nanny. The fee varies based on your requirements. Would you like specific pricing information?"
      ],
      booking_help: [
        "I can help you book a nanny! First, make sure your profile settings are complete, then go to 'Find your perfect Nanny' on your dashboard to browse available services.",
        "Ready to find your perfect nanny? Complete your profile first, then visit the 'Find your perfect Nanny' tab on your dashboard where you'll see all available services and nannies."
      ],
      cancellation: [
        "I can help you cancel your booking. Do you have an active booking you'd like to cancel?",
        "Need to cancel? I'll guide you through it. Is this urgent or can we plan it?"
      ],
      schedule_change: [
        "Let's update your booking! What changes do you need to make to your schedule?",
        "I can help modify your booking. What specifically needs to be changed?"
      ],
      booking_modification: [
        "I can help you modify your booking! What would you like to change - services, schedule, or requirements?",
        "Let's update your booking. Are you looking to add services, change your schedule, or make other adjustments?"
      ],
      modification_fees: [
        "I can explain our modification fees. Most service additions are free - you just pay the adjusted rate. What type of change are you considering?",
        "Modification fees vary by change type. Minor adjustments are usually free. What specific modification do you need?"
      ],
      nanny_replacement: [
        "I can help you request a nanny replacement. What's prompting this request - compatibility, performance, or scheduling issues?",
        "Let's find you a better match! The first replacement is free. What concerns do you have with your current nanny?"
      ],
      payment_issue: [
        "I'm here to help with your payment issue. What's happening with your payment?",
        "Let's fix your payment problem! Can you tell me what specific issue you're facing?"
      ],
      nanny_complaint: [
        "I'm sorry you're having concerns. Would you like me to connect you with our Admin Angel team right away?",
        "I understand your concerns. Let me connect you with our Admin Angel team for immediate help."
      ],
      general_inquiry: [
        "Hi! I'm Kelello, your AI assistant. How can I help you today?",
        "Hello! I'm here to help with your nanny services. What do you need assistance with?"
      ],
      cooking_services: [
        "I can tell you all about our cooking services! Our nannies can prepare healthy meals for your family.",
        "Many of our nannies offer excellent cooking and meal preparation services. What would you like to know?"
      ],
      driving_services: [
        "Our driving services include school pickups, activities, and errands. What driving support do you need?",
        "I can help you understand our transportation services. Are you looking for school runs or other driving support?"
      ],
      special_needs_care: [
        "We have specially trained nannies for diverse ability support. They provide excellent specialized care.",
        "Our special needs nannies have additional training in therapeutic techniques and adaptive care. How can I help?"
      ],
      housekeeping: [
        "Our nannies can help with light housekeeping related to childcare. What specific tasks are you interested in?",
        "I can explain what housekeeping services our nannies provide alongside childcare. What would you like to know?"
      ],
      verification_process: [
        "All our nannies go through comprehensive verification including background checks and interviews. What safety questions do you have?",
        "I can walk you through our thorough nanny screening process. What verification details interest you?"
      ],
      live_in_vs_live_out: [
        "I can explain the differences between live-in and live-out arrangements. Which option interests you?",
        "Let me help you understand live-in versus live-out nanny arrangements and their benefits."
      ],
      emergency_care: [
        "We provide emergency nanny services for urgent situations. Do you need immediate childcare help?",
        "I can help you with emergency nanny booking. How urgent is your childcare need?"
      ],
      rates_pricing: [
        "I can explain our pricing structure for different services and booking types. What rates would you like to know about?",
        "Let me break down our pricing for you. Are you interested in short-term or long-term rates?"
      ],
      training_education: [
        "Our nannies have various qualifications including ECD and Montessori training. What educational background interests you?",
        "I can tell you about our nannies' professional training and certifications. What qualifications are important to you?"
      ],
      communication_support: [
        "You can communicate through our app's chat system, and our Admin Angel team is always here to help!",
        "I can guide you on how to stay in touch with your nanny and get support when needed."
      ],
      interview_process: [
        "We facilitate interviews so you can meet potential nannies before booking. Would you like to know how this works?",
        "I can explain our interview process to help you find the perfect nanny match for your family."
      ],
      backup_services: [
        "We provide backup nanny services when your regular nanny is unavailable. Do you need temporary coverage?",
        "I can help you understand our replacement and backup nanny options. What situation are you facing?"
      ]
    };

    const intentResponses = responses[intent.intent as keyof typeof responses] || responses.general_inquiry;
    const selectedResponse = intentResponses[Math.floor(Math.random() * intentResponses.length)];

    // Check if response suggests escalation
    const escalationNeeded = selectedResponse.toLowerCase().includes('admin angel') || 
                            selectedResponse.toLowerCase().includes('connect you') ||
                            intent.intent === 'nanny_complaint';

    return {
      message: selectedResponse,
      confidence: intent.confidence,
      sources: [],
      intent,
      escalationNeeded,
      responseType: 'conversational'
    };
  }

  private fuzzyMatch(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Simple word matching
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  private semanticMatch(query: string, question: string, answer: string): number {
    const queryLower = query.toLowerCase();
    const questionLower = question.toLowerCase();
    const answerLower = answer.toLowerCase();
    
    // Direct match in question
    const questionMatch = this.fuzzyMatch(queryLower, questionLower);
    
    // Keyword relevance in answer
    const queryWords = queryLower.split(' ').filter(word => word.length > 3);
    let answerRelevance = 0;
    
    for (const word of queryWords) {
      if (answerLower.includes(word)) {
        answerRelevance += 0.1;
      }
    }
    
    // Semantic similarity based on context
    let contextScore = 0;
    const contextKeywords = {
      cost: ['price', 'fee', 'rate', 'charge', 'payment', 'expensive', 'cheap', 'affordable'],
      process: ['how', 'step', 'procedure', 'way', 'method'],
      time: ['when', 'schedule', 'duration', 'long', 'quick', 'fast'],
      quality: ['good', 'best', 'qualified', 'experienced', 'trained']
    };
    
    for (const [concept, keywords] of Object.entries(contextKeywords)) {
      const queryHasConcept = keywords.some(kw => queryLower.includes(kw));
      const answerHasConcept = keywords.some(kw => answerLower.includes(kw));
      
      if (queryHasConcept && answerHasConcept) {
        contextScore += 0.2;
      }
    }
    
    return questionMatch + answerRelevance + contextScore;
  }

  private handleUnknownQuery(query: string, context: ConversationContext): AIResponse {
    const queryLower = query.toLowerCase();
    
    // Try to extract key concepts and suggest relevant topics
    const concepts = {
      'money': ['I can help you understand our pricing and fees. What specifically would you like to know about costs?'],
      'time': ['I can help with scheduling and timing questions. Are you asking about booking times, availability, or deadlines?'],
      'safety': ['Safety is our top priority! I can explain our verification process and safety measures. What safety aspect interests you?'],
      'quality': ['I can tell you about our nanny qualifications and quality standards. What would you like to know?'],
      'problem': ['I\'m here to help solve any issues! Could you tell me more specifically what problem you\'re experiencing?']
    };
    
    for (const [concept, responses] of Object.entries(concepts)) {
      if (queryLower.includes(concept)) {
        return {
          message: responses[0],
          confidence: 0.6,
          sources: [],
          intent: { intent: 'clarification_needed', confidence: 0.6, entities: [concept] },
          escalationNeeded: false,
          responseType: 'conversational'
        };
      }
    }
    
    // If still no match, provide intelligent fallback
    return {
      message: "I want to make sure I give you the most helpful answer! Could you rephrase your question or let me know if you're asking about:\n\n• Booking and scheduling\n• Pricing and fees\n• Nanny services and qualifications\n• Modifications or cancellations\n• Safety and verification\n\nOr would you prefer to speak with our Admin Angel team?",
      confidence: 0.5,
      sources: [],
      intent: { intent: 'clarification_needed', confidence: 0.5, entities: ['unknown_query'] },
      escalationNeeded: false,
      responseType: 'conversational'
    };
  }
}

export const conversationalAI = new ConversationalAIService();
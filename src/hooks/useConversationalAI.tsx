import { useState, useEffect, useCallback } from 'react';
import { conversationalAI } from '@/services/conversationalAI';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  timestamp: string;
  is_system?: boolean;
  confidence?: number;
  sources?: Array<{
    content: string;
    source: string;
    score: number;
  }>;
}

interface ConversationState {
  messages: ChatMessage[];
  isInitialized: boolean;
  isLoading: boolean;
  sessionId: string;
  contextBuffer: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }>;
}

export const useConversationalAI = (userType: 'client' | 'nanny') => {
  const { user } = useAuth();
  const [state, setState] = useState<ConversationState>({
    messages: [
      {
        id: '1',
        sender_id: 'system',
        message: `Hi Chief of Home, I'm Kellello, your friendly care companion. How can I help you today?`,
        timestamp: new Date().toISOString(),
        is_system: true,
        confidence: 1.0
      }
    ],
    isInitialized: false,
    isLoading: false,
    sessionId: `session-${Date.now()}`,
    contextBuffer: []
  });

  const [escalationNeeded, setEscalationNeeded] = useState(false);

  // Set AI as initialized immediately for faster startup
  useEffect(() => {
    console.log('Initializing lightweight conversational AI...');
    setState(prev => ({
      ...prev,
      isInitialized: true
    }));
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || state.isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender_id: user?.id || 'anonymous',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      confidence: 1.0
    };

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      contextBuffer: [
        ...prev.contextBuffer,
        {
          sender: 'user',
          message: message.trim(),
          timestamp: new Date().toISOString()
        }
      ].slice(-10) // Keep last 10 messages for context
    }));

    try {
      // Use lightweight AI processing
      const aiResponse = await conversationalAI.processUserQuery(message, {
        userId: user?.id,
        userType,
        previousMessages: state.contextBuffer,
        sessionId: state.sessionId
      });

      const systemMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender_id: 'system',
        message: aiResponse.message,
        timestamp: new Date().toISOString(),
        is_system: true,
        confidence: aiResponse.confidence,
        sources: aiResponse.sources
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, systemMessage],
        isLoading: false,
        contextBuffer: [
          ...prev.contextBuffer,
          {
            sender: 'assistant',
            message: aiResponse.message,
            timestamp: new Date().toISOString()
          }
        ].slice(-10)
      }));

      // Handle escalation - add proper response before setting flag
      if (aiResponse.escalationNeeded) {
        const escalationMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          sender_id: 'system',
          message: "I understand you'd like to speak with one of our amazing Admin Angels! They're real people who can provide personalized assistance. Click the button below to connect with them.",
          timestamp: new Date().toISOString(),
          is_system: true,
          confidence: 1.0
        };

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, escalationMessage],
        }));
        
        setEscalationNeeded(true);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender_id: 'system',
        message: "I'm experiencing some technical difficulties right now. Let me connect you with our support team who can help you immediately!",
        timestamp: new Date().toISOString(),
        is_system: true,
        confidence: 0.3
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false
      }));
      
      setEscalationNeeded(true);
    }
  }, [state.isInitialized, state.isLoading, state.contextBuffer, state.sessionId, user?.id, userType]);

  const clearConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [prev.messages[0]], // Keep only the initial greeting
      contextBuffer: [],
      sessionId: `session-${Date.now()}`
    }));
    setEscalationNeeded(false);
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    escalationNeeded,
    sendMessage,
    clearConversation,
    setEscalationNeeded
  };
};
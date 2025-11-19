import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConversationalAI } from '@/hooks/useConversationalAI';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Phone, 
  Brain,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface SmartChatWidgetProps {
  userType: 'client' | 'nanny';
  onEscalateToHuman?: () => void;
  forceOpen?: boolean;
}

export const SmartChatWidget = ({ userType, onEscalateToHuman, forceOpen }: SmartChatWidgetProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createOrGetChatRoom } = useChatRooms();
  const [isOpen, setIsOpen] = useState(forceOpen || false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  const handleEscalateToHuman = async () => {
    if (!user) return;
    
    try {
      // Get the first admin user ID - you might want to implement a proper admin selection logic
      const { data: adminUsers, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      if (error || !adminUsers || adminUsers.length === 0) {
        throw new Error('No admin users found');
      }

      const adminUserId = adminUsers[0].user_id;
      
      // Create or get chat room with admin
      const roomId = await createOrGetChatRoom(adminUserId, 'client_admin');
      
      if (roomId) {
        // Close the chat widget
        setIsOpen(false);
        
        // Navigate to admin support page with chat rooms tab active
        navigate('/admin/support?tab=chats');
        
        toast({
          title: "Connected to Admin Support",
          description: "You're now connected with our support team",
        });
      }
    } catch (error) {
      console.error('Error escalating to human:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to support. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Update isOpen when forceOpen changes
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
    }
  }, [forceOpen]);
  
  const {
    messages,
    isLoading,
    isInitialized,
    escalationNeeded,
    sendMessage: aiSendMessage,
    setEscalationNeeded
  } = useConversationalAI(userType);

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    // Check if user wants to speak with human - enhanced detection
    const escalationKeywords = [
      'speak with human', 'human agent', 'real person', 'admin angel',
      'speak to admin', 'talk to admin', 'live chat', 'contact admin',
      'urgent help', 'not helpful', "can't help", 'frustrated', 'complaint',
      'escalate', 'supervisor', 'connect me with', 'talk to someone'
    ];
    
    if (escalationKeywords.some(keyword => currentMessage.toLowerCase().includes(keyword))) {
      
      setEscalationNeeded(true);
      setCurrentMessage('');
      
      if (onEscalateToHuman) {
        onEscalateToHuman();
      }
      return;
    }

    const messageToSend = currentMessage;
    setCurrentMessage('');
    
    try {
      await aiSendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Message Error",
        description: "There was an issue sending your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleConnectWithAngel = () => {
    if (!user?.email) {
      toast({
        title: "Email Required",
        description: "Please ensure your email is set in your profile",
        variant: "destructive",
      });
      return;
    }

    // Set default email message and open dialog
    const defaultMessage = `Hi NannyGold Team,

I'd love to connect with one of your Angels for some home and childcare support.

My situation: [Please describe your specific needs here]

Additional details: [Any other information that would be helpful]

Looking forward to hearing from you!

Thanks,  
${user.user_metadata?.full_name || 'NannyGold Client'}

---
Client ID: ${user.id}
Date: ${new Date().toLocaleString()}
Submitted from: NannyGold Chat Widget`;

    setEmailMessage(defaultMessage);
    setShowEmailDialog(true);
  };

  const handleSendEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-angel-connect-email', {
        body: {
          clientEmail: user?.email,
          clientName: user?.user_metadata?.full_name || 'NannyGold Client',
          message: emailMessage
        }
      });

      if (!error) {
        toast({
          title: "Request Sent!",
          description: "Your request has been sent to NannyGold. An Angel will contact you soon!",
        });
        setEscalationNeeded(false);
        setShowEmailDialog(false);
      } else {
        throw new Error(error?.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending angel connect email:', error);
      // Fallback to mailto link
      const subject = "Connect me with a NannyGold Angel ✨";
      const mailtoLink = `mailto:care@nannygold.co.za?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailMessage)}`;
      window.open(mailtoLink, '_blank');
      
      toast({
        title: "Email Client Opened",
        description: "We've opened your email client with your message ready to send.",
      });
      setShowEmailDialog(false);
    }
  };

  // Don't show anything if not forced open or manually opened
  if (!forceOpen && !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 h-96 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Support
              {isInitialized && (
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-xs text-muted-foreground">
                  {isInitialized ? 'AI Ready' : 'Loading...'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col h-full p-3">
          <ScrollArea className="flex-1 mb-3">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_system ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    message.is_system 
                      ? 'bg-gray-100 text-gray-800' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    <div className="flex items-center gap-1 mb-1">
                      {message.is_system ? (
                        <Brain className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      <span className="text-xs opacity-70 flex items-center gap-1">
                        {message.is_system ? 'Kelello AI' : 'You'}
                        {message.confidence && message.confidence > 0.8 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {Math.round(message.confidence * 100)}%
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{message.message}</div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 text-xs opacity-70">
                        Sources: {message.sources.map(s => s.source).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Brain className="w-3 h-3 text-primary animate-pulse" />
                      <span className="text-xs">AI is thinking...</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {escalationNeeded && (
            <div className="mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectWithAngel}
                className="w-full text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Phone className="w-3 h-3 mr-1" />
                Connect with an Angel
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="text-sm"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !currentMessage.trim()}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground mt-1 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by Advanced AI • Available 24/7
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Your Message to NannyGold Angels</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input 
                id="email-subject"
                value="Connect me with a NannyGold Angel ✨" 
                disabled 
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="email-to">To</Label>
              <Input 
                id="email-to"
                value="care@nannygold.co.za" 
                disabled 
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={12}
                className="text-sm"
                placeholder="Write your message here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail}>
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
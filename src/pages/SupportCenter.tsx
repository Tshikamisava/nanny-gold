
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Phone, MessageCircle, Plus, Clock, CheckCircle, AlertTriangle, ArrowLeft, Headphones } from "lucide-react";
import { SupportTicketDialog } from "@/components/SupportTicketDialog";
import { SmartChatWidget } from "@/components/SmartChatWidget";
import WhatsAppStyleChat from "@/components/WhatsAppStyleChat";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { EmergencyHotlineDialog } from "@/components/EmergencyHotlineDialog";

const SupportCenter = () => {
  const navigate = useNavigate();
  const { tickets, loading, loadTickets, loadChatMessages, sendMessage } = useSupportTickets();
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  

  const handleEmergencyCall = () => {
    // Open emergency hotline dialog instead of direct call
    console.log("Opening emergency hotline dialog...");
  };

  const handleLiveChat = () => {
    setChatOpen(true);
  };

  const handleTicketClick = async (ticket: any) => {
    setSelectedTicket(ticket);
    const messages = await loadChatMessages(ticket.id);
    setChatMessages(messages);
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    
    try {
      await sendMessage(selectedTicket.id, newMessage);
      setNewMessage('');
      const messages = await loadChatMessages(selectedTicket.id);
      setChatMessages(messages);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <MessageCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Group tickets by status
  const { pendingTickets, resolvedTickets } = useMemo(() => {
    const pending = tickets.filter(ticket => 
      ticket.status === 'open' || ticket.status === 'in_progress'
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const resolved = tickets.filter(ticket => 
      ticket.status === 'resolved' || ticket.status === 'closed'
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return { pendingTickets: pending, resolvedTickets: resolved };
  }, [tickets]);

  const faqs = [
    {
      question: "How are nannies vetted?",
      answer: "All nannies undergo comprehensive background checks, reference verification, and skills assessment."
    },
    {
      question: "What if I'm not satisfied?",
      answer: "We offer a satisfaction guarantee. Contact us within 90 days for a nanny replacement."
    },
    {
      question: "Can I change my booking?",
      answer: "Yes, you can modify bookings up to 24 hours in advance through the app."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
            <p className="text-muted-foreground">Get help and support</p>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/e08f85db-a755-4e37-9622-463b1ecb94c9.png" 
            alt="Support" 
            className="w-20 h-20 mx-auto mb-4"
          />
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Support Center
          </h1>
          <p className="text-muted-foreground">
            We're here to help 24/7
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Emergency & Quick Actions */}
          <div className="space-y-4">
            {/* Emergency Contact */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4 md:p-6 text-center">
                <h3 className="font-semibold mb-2">Emergency Support</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For urgent childcare emergencies
                </p>
                <EmergencyHotlineDialog>
                  <Button variant="destructive" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Emergency Hotlines
                  </Button>
                </EmergencyHotlineDialog>
              </CardContent>
            </Card>

            {/* Support Options */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  {/* DISABLED: Live Chat - disabled until post-launch */}
                  <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold text-muted-foreground">Live Chat</h3>
                        <p className="text-xs text-muted-foreground">Coming after launch</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="cursor-not-allowed"
                    >
                      Coming Soon
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <SupportTicketDialog 
                      trigger={
                        <Button className="w-full" variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Support Ticket
                        </Button>
                      }
                      onTicketCreated={() => loadTickets()}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Help</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b pb-3 last:border-b-0">
                    <h4 className="font-medium text-sm mb-1">{faq.question}</h4>
                    <p className="text-xs text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Support Tickets */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>Your Support Tickets</span>
                  <Badge variant="secondary">{tickets.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[400px] md:h-[500px]">
                  {/* Tickets List */}
                  <div className="border-r">
                    <ScrollArea className="h-[350px] md:h-[450px]">
                      {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading tickets...
                        </div>
                      ) : tickets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No support tickets yet</p>
                          <p className="text-xs">Create a ticket to get help</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Pending Tickets */}
                          {pendingTickets.length > 0 && (
                            <div>
                              <div className="p-3 md:p-4 border-b bg-orange-50 dark:bg-orange-950/20">
                                <h3 className="font-medium text-sm md:text-base flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-orange-500" />
                                  Pending ({pendingTickets.length})
                                </h3>
                              </div>
                              <div className="space-y-2 p-3 md:p-4">
                                {pendingTickets.map((ticket) => (
                                  <div
                                    key={ticket.id}
                                    className={`p-2 md:p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                                      selectedTicket?.id === ticket.id ? 'border-primary bg-muted/30' : ''
                                    }`}
                                    onClick={() => handleTicketClick(ticket)}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Badge className={`${getPriorityColor(ticket.priority)} text-white text-xs`}>
                                          {ticket.priority}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          {getStatusIcon(ticket.status)}
                                          <span className="text-xs">{ticket.status}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <h4 className="font-medium text-sm mb-1">{ticket.subject}</h4>
                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                      {ticket.description}
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                      {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resolved Tickets */}
                          {resolvedTickets.length > 0 && (
                            <div>
                              <div className="p-3 md:p-4 border-b bg-green-50 dark:bg-green-950/20">
                                <h3 className="font-medium text-sm md:text-base flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  Resolved ({resolvedTickets.length})
                                </h3>
                              </div>
                              <div className="space-y-2 p-3 md:p-4">
                                {resolvedTickets.map((ticket) => (
                                  <div
                                    key={ticket.id}
                                    className={`p-2 md:p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 opacity-75 ${
                                      selectedTicket?.id === ticket.id ? 'border-primary bg-muted/30' : ''
                                    }`}
                                    onClick={() => handleTicketClick(ticket)}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Badge className={`${getPriorityColor(ticket.priority)} text-white text-xs`}>
                                          {ticket.priority}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          {getStatusIcon(ticket.status)}
                                          <span className="text-xs">{ticket.status}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <h4 className="font-medium text-sm mb-1">{ticket.subject}</h4>
                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                      {ticket.description}
                                    </p>
                                    <div className="text-xs text-muted-foreground">
                                      {format(new Date(ticket.created_at), 'MMM d, HH:mm')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Chat Interface */}
                  <div className="flex flex-col">
                    <div className="p-3 md:p-4 border-b bg-muted/30">
                      <h3 className="font-medium text-sm md:text-base">
                        {selectedTicket ? `Chat - ${selectedTicket.subject}` : 'Select a ticket'}
                      </h3>
                    </div>
                    
                    {selectedTicket ? (
                      <>
                        <ScrollArea className="flex-1 p-3 md:p-4">
                          <div className="space-y-4">
                            {chatMessages.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No messages yet</p>
                              </div>
                            ) : (
                              chatMessages.map((message) => (
                                <div key={message.id} className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium">
                                      {message.sender_id === selectedTicket.user_id ? 'You' : 'Support'}
                                    </span>
                                    <span>{format(new Date(message.created_at), 'MMM d, HH:mm')}</span>
                                  </div>
                                  <div className="text-sm bg-muted/50 rounded-lg p-3">
                                    {message.message}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                        
                        <div className="p-3 md:p-4 border-t space-y-2">
                          <Textarea
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={2}
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={!newMessage.trim()}
                            className="w-full"
                            size="sm"
                          >
                            Send Message
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Select a ticket to view conversation</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* DISABLED: AI Chat Widget - disabled until post-launch */}
        {false && chatOpen && (
          <SmartChatWidget 
            userType={user?.user_metadata?.user_type || 'client'} 
            forceOpen={chatOpen}
          />
        )}
      </div>
    </div>
  );
};

export default SupportCenter;

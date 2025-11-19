import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, Users, AlertTriangle } from 'lucide-react';

interface EmergencyHotlineDialogProps {
  children: React.ReactNode;
}

export const EmergencyHotlineDialog = ({ children }: EmergencyHotlineDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Mobile detection
    const checkMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  const emergencyContacts = [
    {
      name: "NannyGold Emergency Line",
      number: "+27662733942", // Cleaned number for tel: URI
      displayNumber: "+27 66 273 3942",
      available: "24/7",
      type: "primary",
      description: "For immediate safety concerns and critical situations"
    },
    {
      name: "After-Hours Support",
      number: "+27636922760", // Cleaned number for tel: URI
      displayNumber: "+27 63 692 2760", 
      available: "18:00 - 08:00",
      type: "secondary",
      description: "For urgent non-emergency support outside business hours"
    },
    {
      name: "Medical Emergency",
      number: "+2782911", // Cleaned number for tel: URI
      displayNumber: "+27 82 911",
      available: "24/7",
      type: "emergency",
      description: "Emergency medical services"
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-red-500" />
            Emergency Hotline & Contact Center
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Online</span>
                </div>
                <p className="text-xs text-muted-foreground">All lines operational</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">&lt; 10 min</span>
                </div>
                <p className="text-xs text-muted-foreground">Avg wait time</p>
              </CardContent>
            </Card>
          </div>

          {/* Emergency Contacts */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Emergency Contact Numbers</h3>
            {emergencyContacts.map((contact, index) => (
              <Card key={index} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{contact.name}</h4>
                        <Badge 
                          variant={contact.type === 'emergency' ? 'destructive' : contact.type === 'primary' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {contact.type === 'emergency' ? 'Emergency' : contact.type === 'primary' ? 'Primary' : 'After Hours'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{contact.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.displayNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {contact.available}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* Call button - show on mobile or show disabled on desktop */}
                      {isMobile ? (
                        <a
                          href={`tel:${contact.number}`}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </a>
                      ) : (
                        <Button 
                          size="sm" 
                          disabled
                          className="bg-gray-300 text-gray-600 cursor-not-allowed hover:bg-gray-300"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(contact.displayNumber)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Emergency Escalation Protocol */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm text-red-900 mb-1">Emergency Escalation Protocol</h4>
                  <ul className="text-xs text-red-800 space-y-1">
                    <li>• Child safety issues → Call NannyGold Emergency immediately</li>
                    <li>• Medical emergencies → Call 10177 first, then notify NannyGold</li>
                    <li>• Security concerns → Document details and escalate priority to URGENT</li>
                    <li>• After-hours critical issues → Use after-hours line for immediate response</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
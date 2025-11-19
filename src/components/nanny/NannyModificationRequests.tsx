import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, User, DollarSign, FileText, AlertCircle } from 'lucide-react';

interface BookingModification {
  id: string;
  booking_id: string;
  client_id: string;
  modification_type: string;
  old_values: any;
  new_values: any;
  status: string;
  requested_at: string;
  price_adjustment: number;
  notes: string;
  admin_notes?: string;
  bookings: {
    start_date: string;
    end_date?: string;
    booking_type: string;
    total_monthly_cost: number;
  };
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export default function NannyModificationRequests() {
  const { user } = useAuth();
  const [modifications, setModifications] = useState<BookingModification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModification, setSelectedModification] = useState<BookingModification | null>(null);
  const [nannyNotes, setNannyNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadModifications();
    }
  }, [user]);

  const loadModifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('booking_modifications')
        .select(`
          *,
          bookings!inner(
            start_date,
            end_date,
            booking_type,
            total_monthly_cost
          ),
          profiles!booking_modifications_client_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending_nanny_response')
        .eq('bookings.nanny_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setModifications((data as any) || []);
    } catch (error) {
      console.error('Error loading modifications:', error);
      toast({
        title: "Error",
        description: "Failed to load modification requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModificationResponse = async (modificationId: string, action: 'accept' | 'decline') => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('booking_modifications')
        .update({
          status: action === 'accept' ? 'nanny_accepted' : 'nanny_declined',
          nanny_responded_by: user.id,
          nanny_responded_at: new Date().toISOString(),
          nanny_notes: nannyNotes
        })
        .eq('id', modificationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Modification request ${action === 'accept' ? 'accepted' : 'declined'} successfully`,
      });

      setSelectedModification(null);
      setNannyNotes('');
      loadModifications();
    } catch (error) {
      console.error(`Error ${action}ing modification:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} modification request`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getModificationTypeDisplay = (type: string) => {
    switch (type) {
      case 'service_addition': return 'Add Services';
      case 'service_removal': return 'Remove Services';
      case 'cancellation': return 'Cancellation';
      default: return type;
    }
  };

  const getServiceNames = (services: any) => {
    if (!services) return [];
    return Object.keys(services).map(key => {
      if (key === 'special_needs') return 'Diverse Ability Support';
      return key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading modification requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modification Requests</h1>
        <p className="text-muted-foreground">
          Review and respond to approved booking modification requests from your clients.
        </p>
      </div>

      {modifications.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No Pending Requests</h3>
              <p className="text-muted-foreground">All modification requests have been processed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {modifications.map((modification) => (
            <Card key={modification.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {getModificationTypeDisplay(modification.modification_type)}
                    </CardTitle>
                    <CardDescription>
                      Requested on {format(new Date(modification.requested_at), 'PPP')} by {modification.profiles.first_name} {modification.profiles.last_name}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Awaiting Response
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Admin Approved</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    This modification request has been reviewed and approved by our admin team. Your response is required to proceed.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Booking Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>Type: {modification.bookings.booking_type?.replace('_', ' ')}</p>
                      <p>Current Cost: R{modification.bookings.total_monthly_cost?.toFixed(2)}/month</p>
                      <p>Period: {format(new Date(modification.bookings.start_date), 'MMM dd, yyyy')} - {modification.bookings.end_date ? format(new Date(modification.bookings.end_date), 'MMM dd, yyyy') : 'Ongoing'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Financial Impact</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          Price Change: 
                          <span className={`font-medium ml-1 ${modification.price_adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {modification.price_adjustment >= 0 ? '+' : ''}R{modification.price_adjustment?.toFixed(2)}
                          </span>
                        </span>
                      </div>
                      <p>New Total: R{(modification.bookings.total_monthly_cost + modification.price_adjustment).toFixed(2)}/month</p>
                    </div>
                  </div>
                </div>

                {/* Modification Details */}
                <div>
                  <h4 className="font-medium mb-2">Modification Details</h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    {modification.modification_type === 'service_addition' && (
                      <div>
                        <p className="text-sm font-medium text-green-600">Services to Add:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {getServiceNames(modification.new_values).map(service => (
                            <Badge key={service} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {modification.modification_type === 'service_removal' && (
                      <div>
                        <p className="text-sm font-medium text-red-600">Services to Remove:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {getServiceNames(modification.old_values).map(service => (
                            <Badge key={service} variant="destructive" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {modification.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Client Notes</h4>
                    <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                      {modification.notes}
                    </p>
                  </div>
                )}

                {modification.admin_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Admin Notes</h4>
                    <p className="text-sm text-muted-foreground bg-green-50 p-3 rounded-lg">
                      {modification.admin_notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => setSelectedModification(modification)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Accept
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Accept Modification Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>Are you sure you want to accept this modification request? The changes will be applied to the booking.</p>
                        <div>
                          <label className="text-sm font-medium">Response Notes (Optional)</label>
                          <Textarea
                            value={nannyNotes}
                            onChange={(e) => setNannyNotes(e.target.value)}
                            placeholder="Add any notes about accepting this modification..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            onClick={() => handleModificationResponse(modification.id, 'accept')}
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Acceptance'}
                          </Button>
                          <Button variant="outline" onClick={() => setSelectedModification(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        onClick={() => setSelectedModification(modification)}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Decline
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Decline Modification Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>Are you sure you want to decline this modification request? The client will be notified of your decision.</p>
                        <div>
                          <label className="text-sm font-medium">Decline Reason (Optional)</label>
                          <Textarea
                            value={nannyNotes}
                            onChange={(e) => setNannyNotes(e.target.value)}
                            placeholder="Explain why you're declining this modification..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            variant="destructive"
                            onClick={() => handleModificationResponse(modification.id, 'decline')}
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Decline'}
                          </Button>
                          <Button variant="outline" onClick={() => setSelectedModification(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
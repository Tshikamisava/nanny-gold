import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, User, DollarSign, FileText } from 'lucide-react';

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
    nannies: {
      profiles: {
        first_name: string;
        last_name: string;
      };
    };
  };
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export default function BookingModificationManagement() {
  const [modifications, setModifications] = useState<BookingModification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModification, setSelectedModification] = useState<BookingModification | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadModifications();
  }, []);

  const loadModifications = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_modifications')
        .select(`
          *,
          bookings!inner(
            start_date,
            end_date,
            booking_type,
            total_monthly_cost,
            nannies!inner(
              profiles!inner(first_name, last_name)
            )
          ),
          profiles!booking_modifications_client_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending_admin_review')
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

  const handleModificationAction = async (modificationId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('booking_modifications')
        .update({
          status: action === 'approve' ? 'admin_approved' : 'admin_rejected',
          admin_reviewed_by: user.id,
          admin_reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', modificationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Modification request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      setSelectedModification(null);
      setAdminNotes('');
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
        <h1 className="text-3xl font-bold tracking-tight">Booking Modification Requests</h1>
        <p className="text-muted-foreground">
          Review and approve or reject client booking modification requests.
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
                      Requested on {format(new Date(modification.requested_at), 'PPP')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Pending Review</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Client Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>Name: {modification.profiles?.first_name} {modification.profiles?.last_name}</p>
                      <p>Booking Type: {modification.bookings.booking_type?.replace('_', ' ')}</p>
                      <p>Current Cost: R{modification.bookings.total_monthly_cost?.toFixed(2)}/month</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Nanny Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>Name: {modification.bookings.nannies.profiles.first_name} {modification.bookings.nannies.profiles.last_name}</p>
                      <p>Booking Period: {format(new Date(modification.bookings.start_date), 'MMM dd, yyyy')} - {modification.bookings.end_date ? format(new Date(modification.bookings.end_date), 'MMM dd, yyyy') : 'Ongoing'}</p>
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
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">
                        Price Adjustment: 
                        <span className={`font-medium ml-1 ${modification.price_adjustment >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {modification.price_adjustment >= 0 ? '+' : ''}R{modification.price_adjustment?.toFixed(2)}
                        </span>
                      </span>
                    </div>
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

                <div className="flex gap-3 pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => setSelectedModification(modification)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Approve Modification Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>Are you sure you want to approve this modification request? The nanny will be notified to accept or decline.</p>
                        <div>
                          <label className="text-sm font-medium">Admin Notes (Optional)</label>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add any notes for the nanny..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            onClick={() => handleModificationAction(modification.id, 'approve')}
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Approval'}
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
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Modification Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>Are you sure you want to reject this modification request? The client will be notified.</p>
                        <div>
                          <label className="text-sm font-medium">Rejection Reason (Required)</label>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Explain why this request is being rejected..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            variant="destructive"
                            onClick={() => handleModificationAction(modification.id, 'reject')}
                            disabled={isProcessing || !adminNotes.trim()}
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Rejection'}
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
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Clock, DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BookingModification {
  id: string;
  modification_type: string;
  old_values: any;
  new_values: any;
  status: string;
  requested_at: string;
  processed_at?: string;
  notes?: string;
  price_adjustment: number;
  effective_date?: string;
}

interface BookingModificationHistoryProps {
  bookingId: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
    case 'applied':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
    case 'applied':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
};

const formatModificationType = (type: string) => {
  switch (type) {
    case 'service_addition':
      return 'Service Addition';
    case 'service_removal':
      return 'Service Removal';
    case 'cancellation':
      return 'Cancellation';
    case 'date_change':
      return 'Date Change';
    case 'schedule_change':
      return 'Schedule Change';
    default:
      return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const getServiceNames = (services: any) => {
  if (!services) return '';
  
  const serviceMap: { [key: string]: string } = {
    cooking: 'Cooking',
    driving_support: 'Driving Support',
    light_house_keeping: 'Light Housekeeping',
    pet_care: 'Pet Care',
    special_needs: 'Diverse Ability Support'
  };
  
  return Object.keys(services)
    .map(key => serviceMap[key] || key)
    .join(', ');
};

export const BookingModificationHistory: React.FC<BookingModificationHistoryProps> = ({ bookingId }) => {
  const [modifications, setModifications] = useState<BookingModification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchModifications();
  }, [bookingId]);

  const fetchModifications = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_modifications')
        .select('*')
        .eq('booking_id', bookingId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setModifications(data || []);
    } catch (error) {
      console.error('Error fetching modifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Modification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading modification history...</div>
        </CardContent>
      </Card>
    );
  }

  if (modifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Modification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No modification requests found for this booking.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Modification History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {modifications.map((modification) => (
          <div key={modification.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(modification.status)}
                <div>
                  <h4 className="font-medium">{formatModificationType(modification.modification_type)}</h4>
                  <p className="text-sm text-muted-foreground">
                    Requested on {format(new Date(modification.requested_at), 'PPP')}
                  </p>
                </div>
              </div>
              <Badge variant={getStatusColor(modification.status) as any}>
                {modification.status.charAt(0).toUpperCase() + modification.status.slice(1)}
              </Badge>
            </div>

            <div className="grid gap-2 text-sm">
              {modification.modification_type === 'service_addition' && modification.new_values && (
                <div>
                  <span className="font-medium text-green-600">Added Services: </span>
                  {getServiceNames(modification.new_values)}
                </div>
              )}
              
              {modification.modification_type === 'service_removal' && modification.old_values && (
                <div>
                  <span className="font-medium text-red-600">Removed Services: </span>
                  {getServiceNames(modification.old_values)}
                </div>
              )}

              {modification.price_adjustment !== 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Price Adjustment: </span>
                  <span className={modification.price_adjustment >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {modification.price_adjustment >= 0 ? '+' : ''}R{modification.price_adjustment.toFixed(2)}
                  </span>
                </div>
              )}

              {modification.effective_date && (
                <div>
                  <span className="font-medium">Effective Date: </span>
                  {format(new Date(modification.effective_date), 'PPP')}
                </div>
              )}

              {modification.processed_at && (
                <div>
                  <span className="font-medium">Processed: </span>
                  {format(new Date(modification.processed_at), 'PPP')}
                </div>
              )}
            </div>

            {modification.notes && (
              <div className="bg-gray-50 p-3 rounded text-sm">
                <span className="font-medium">Notes: </span>
                {modification.notes}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
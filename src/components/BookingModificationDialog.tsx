import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, DollarSign, Plus, Minus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SERVICE_PRICING } from '@/constants/servicePricing';

interface Booking {
  id: string;
  status: string;
  start_date: string;
  end_date?: string;
  services: any;
  base_rate: number;
  additional_services_cost: number;
  total_monthly_cost: number;
  booking_type?: string;
}

interface BookingModificationDialogProps {
  booking: Booking;
  onModificationSubmitted: () => void;
}

const serviceOptions = [
  { id: 'cooking', name: 'Cooking', monthlyRate: SERVICE_PRICING.add_ons.cooking.long_term_monthly, description: 'Meal preparation and cooking' },
  { id: 'driving_support', name: 'Driving Support', monthlyRate: SERVICE_PRICING.add_ons.driving.long_term_monthly, description: 'Transportation assistance' },
  { id: 'special_needs', name: 'Diverse Ability Support', monthlyRate: SERVICE_PRICING.add_ons.diverse_ability.long_term_monthly, description: 'Specialized care for children or other dependants with diverse abilities' },
  // Backup nanny might not be in new pricing explicitly as an add-on with price? 
  // Checking servicePricing.ts: backup_nanny is NOT in the new add_ons list I created in Step 47.
  // I should probably remove it or add it to constants if needed. 
  // For now I will comment it out or assume it's custom.
  // The requirements didn't explicitly list "Backup Nanny" price in Long Term add-ons. 
  // It listed: Diverse Ability, Cooking, Driving, Child > 3, Adult > 2.
  // I will omit backup_nanny for now or give it a placeholder if critical. 
  // The previous price was R100/month. 
  // I'll keep it as legacy if needed but better to remove if not in requirements.
  // I will remove it from the list.
];

export const BookingModificationDialog: React.FC<BookingModificationDialogProps> = ({
  booking,
  onModificationSubmitted
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modificationType, setModificationType] = useState<'add_services' | 'remove_services' | 'cancel' | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentServices = booking.services ?
    Object.entries(booking.services)
      .filter(([key, value]) => value === true)
      .map(([key]) => key) : [];

  const availableServicesToAdd = serviceOptions.filter(
    service => !currentServices.includes(service.id)
  );

  const availableServicesToRemove = serviceOptions.filter(
    service => currentServices.includes(service.id)
  );

  const calculateAdjustment = () => {
    if (!selectedServices.length) return 0;

    const selectedServiceRates = serviceOptions
      .filter(service => selectedServices.includes(service.id))
      .reduce((total, service) => total + service.monthlyRate, 0);

    // Prorate for remaining days in current month (simplified to 30 days)
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const prorationFactor = daysRemaining / 30;

    const adjustment = selectedServiceRates * prorationFactor;
    return modificationType === 'remove_services' ? -adjustment : adjustment;
  };

  const calculateFullServiceAmount = () => {
    if (!selectedServices.length) return 0;

    const selectedServiceRates = serviceOptions
      .filter(service => selectedServices.includes(service.id))
      .reduce((total, service) => total + service.monthlyRate, 0);

    return modificationType === 'remove_services' ? -selectedServiceRates : selectedServiceRates;
  };

  const calculateNextBillingTotal = () => {
    return booking.total_monthly_cost + calculateAdjustment();
  };

  const calculateOngoingMonthlyTotal = () => {
    return booking.total_monthly_cost + calculateFullServiceAmount();
  };

  const handleSubmit = async () => {
    if (!modificationType || (!selectedServices.length && modificationType !== 'cancel')) {
      toast.error('Please select services to modify');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to modify bookings');
        return;
      }

      const modification = {
        booking_id: booking.id,
        client_id: user.id,
        modification_type: modificationType === 'add_services' ? 'service_addition' :
          modificationType === 'remove_services' ? 'service_removal' : 'cancellation',
        old_values: modificationType === 'remove_services' ?
          selectedServices.reduce((acc, serviceId) => ({ ...acc, [serviceId]: true }), {}) : {},
        new_values: modificationType === 'add_services' ?
          selectedServices.reduce((acc, serviceId) => ({ ...acc, [serviceId]: true }), {}) : {},
        price_adjustment: calculateAdjustment(),
        notes,
        effective_date: new Date().toISOString().split('T')[0],
        status: 'pending_admin_review'
      };

      const { error } = await supabase
        .from('booking_modifications')
        .insert(modification);

      if (error) throw error;

      toast.success('Modification request submitted successfully! It will be reviewed and applied to your next billing cycle.');
      setIsOpen(false);
      setModificationType(null);
      setSelectedServices([]);
      setNotes('');
      onModificationSubmitted();
    } catch (error) {
      console.error('Error submitting modification:', error);
      toast.error('Failed to submit modification request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUpcoming = new Date(booking.start_date) > new Date();
  const today = new Date();

  // Determine if this is a single day/night booking (only 1 day duration)
  const isSingleDayBooking = () => {
    if (!booking.end_date) {
      // Single day booking
      return true;
    }
    const duration = Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24));
    return duration <= 1;
  };

  // Check if this is a long-term booking
  const isLongTermBooking = booking.booking_type === 'long_term';

  // Modification rules:
  // - Long-term bookings: always allow modifications if status is valid
  // - Short-term 1 day/night: only before booking starts
  // - Short-term 2+ days/nights: allow modifications even if active
  const canModify = (booking.status === 'confirmed' || booking.status === 'pending' ||
    (booking.status === 'active' && isLongTermBooking)) &&
    (isLongTermBooking || !isSingleDayBooking() || isUpcoming);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="h-4 w-4" />
          Modify Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modify Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="font-medium">{format(new Date(booking.start_date), 'PPP')}</span>
              </div>
              {booking.end_date && (
                <div className="flex justify-between">
                  <span>End Date:</span>
                  <span className="font-medium">{format(new Date(booking.end_date), 'PPP')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {booking.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Current Total:</span>
                <span className="font-medium">R{booking.total_monthly_cost?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium capitalize">{isUpcoming ? 'Upcoming' : 'Ongoing'}</span>
              </div>
            </CardContent>
          </Card>

          {!canModify && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <p className="text-orange-800">
                  {(booking.status !== 'confirmed' && booking.status !== 'pending')
                    ? `This booking cannot be modified because its status is "${booking.status}".`
                    : isSingleDayBooking() && !isUpcoming
                      ? 'Single day/night bookings cannot be modified once they have started.'
                      : 'This booking cannot be modified at this time.'
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {canModify && (
            <>
              {/* Current Services */}
              {currentServices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {currentServices.map(serviceId => {
                        const service = serviceOptions.find(s => s.id === serviceId);
                        return service ? (
                          <Badge key={serviceId} variant="secondary">
                            {service.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Modification Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Modification Type</CardTitle>
                  <CardDescription>
                    Choose what you'd like to modify about your booking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {availableServicesToAdd.length > 0 && (
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${modificationType === 'add_services' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => {
                          setModificationType('add_services');
                          setSelectedServices([]);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Plus className="h-5 w-5" />
                          <div>
                            <h3 className="font-medium">Add Services</h3>
                            <p className="text-sm text-muted-foreground">
                              Add additional services to your current booking
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {availableServicesToRemove.length > 0 && (
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${modificationType === 'remove_services' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => {
                          setModificationType('remove_services');
                          setSelectedServices([]);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Minus className="h-5 w-5" />
                          <div>
                            <h3 className="font-medium">Remove Services</h3>
                            <p className="text-sm text-muted-foreground">
                              Remove services from your current booking
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isUpcoming && (
                      <div
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${modificationType === 'cancel' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => {
                          setModificationType('cancel');
                          setSelectedServices([]);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5" />
                          <div>
                            <h3 className="font-medium">Cancel Booking</h3>
                            <p className="text-sm text-muted-foreground">
                              Cancel this upcoming booking
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Service Selection */}
              {modificationType && modificationType !== 'cancel' && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {modificationType === 'add_services' ? 'Select Services to Add' : 'Select Services to Remove'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(modificationType === 'add_services' ? availableServicesToAdd : availableServicesToRemove).map(service => (
                      <div key={service.id} className="flex items-center space-x-3 p-3 border rounded">
                        <Checkbox
                          id={service.id}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedServices([...selectedServices, service.id]);
                            } else {
                              setSelectedServices(selectedServices.filter(id => id !== service.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <label htmlFor={service.id} className="font-medium cursor-pointer">
                            {service.name}
                          </label>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">R{service.monthlyRate}/month</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Price Adjustment Preview */}
              {modificationType && selectedServices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Price Adjustment Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Current billing amount */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current Monthly Total:</span>
                        <span>R{booking.total_monthly_cost.toFixed(2)}</span>
                      </div>

                      {/* Prorated adjustment */}
                      <div className="flex justify-between text-lg font-medium">
                        <span>Adjustment Amount (Prorated):</span>
                        <span className={calculateAdjustment() >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {calculateAdjustment() >= 0 ? '+' : ''}R{calculateAdjustment().toFixed(2)}
                        </span>
                      </div>

                      <Separator />

                      {/* Next billing cycle total */}
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Next Billing Cycle Total:</span>
                        <span className="text-primary">R{calculateNextBillingTotal().toFixed(2)}</span>
                      </div>

                      <Separator />

                      {/* Ongoing monthly total */}
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Ongoing Monthly Total:</span>
                        <span className="text-primary">R{calculateOngoingMonthlyTotal().toFixed(2)}</span>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Next billing cycle includes prorated charges for remaining days</p>
                        <p>• Subsequent months will be charged the full ongoing monthly amount</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                  <CardDescription>
                    Add any additional comments or special requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any additional details about your modification request..."
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!modificationType || (!selectedServices.length && modificationType !== 'cancel') || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Modification Request'}
                </Button>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Phone, 
  Mail,
  Home,
  Users,
  Star,
  FileText,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Baby
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import RevenueBreakdown from '@/components/RevenueBreakdown';
import { formatCurrency } from '@/utils/pricingUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { formatLocation } from '@/utils/locationFormatter';
import { getHomeSizeDisplayName } from '@/utils/homeSizeDisplay';

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
}

// Helper function to format location as a full address
const formatLocationAddress = (location: any): string => {
  if (!location) return 'Not specified';
  
  try {
    const loc = typeof location === 'string' ? JSON.parse(location) : location;
    const parts = [
      loc.street,
      loc.estate && `Estate: ${loc.estate}`,
      loc.suburb,
      loc.city,
      loc.province?.toUpperCase(),
      loc.postalCode || loc.postal_code
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Not specified';
  } catch {
    return typeof location === 'string' ? location : 'Not specified';
  }
};

// Helper function to calculate hours between two time strings
const calculateHoursBetween = (start: string, end: string): number => {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return (endMinutes - startMinutes) / 60;
};

// Helper function to get housekeeping daily rate based on home size
const getHousekeepingRate = (homeSize: string): number => {
  const rates: Record<string, number> = {
    'pocket_palace': 100,
    'family_hub': 150,
    'grand_estate': 200,
    'monumental_manor': 250,
    'epic_estates': 300
  };
  return rates[homeSize] || 150;
};

// Helper function to calculate short-term breakdown
const calculateShortTermBreakdown = (booking: any) => {
  const schedule = booking.schedule || {};
  const services = booking.services || {};
  const homeSize = booking.home_size;
  const bookingSubType = schedule.bookingType || services.bookingSubType || booking.booking_type;
  
  // Hourly bookings (emergency, date_night, date_day)
  if (['emergency', 'date_night', 'date_day'].includes(bookingSubType)) {
    const baseRate = bookingSubType === 'emergency' ? 80 : bookingSubType === 'date_night' ? 120 : 100;
    const timeSlots = schedule.timeSlots || [];
    const selectedDates = schedule.selectedDates || [];
    
    // Calculate hours per date
    const dateBreakdown = selectedDates.map((date: string, idx: number) => {
      const slot = timeSlots[idx] || timeSlots[0] || { start: '09:00', end: '17:00' };
      const hours = calculateHoursBetween(slot.start, slot.end);
      return { 
        date: format(parseISO(date), 'MMM dd, yyyy (EEE)'), 
        start: slot.start, 
        end: slot.end, 
        hours 
      };
    });
    
    const totalHours = dateBreakdown.reduce((sum, d) => sum + d.hours, 0);
    
    // Calculate add-ons
    const addOns = [];
    let subtotal = baseRate * totalHours;
    
    if (services.cooking) {
      const cookingTotal = 12 * totalHours;
      addOns.push({ name: 'Cooking', rate: 12, unit: 'hr', quantity: totalHours, total: cookingTotal });
      subtotal += cookingTotal;
    }
    
    if (services.householdSupport?.includes('light-housekeeping') || services.lightHousekeeping) {
      const dailyRate = getHousekeepingRate(homeSize);
      const days = selectedDates.length;
      const housekeepingTotal = dailyRate * days;
      addOns.push({ 
        name: `Light Housekeeping (${getHomeSizeDisplayName(homeSize)})`, 
        rate: dailyRate, 
        unit: 'day', 
        quantity: days, 
        total: housekeepingTotal 
      });
      subtotal += housekeepingTotal;
    }
    
    if (services.drivingSupport) {
      const drivingTotal = 25 * totalHours;
      addOns.push({ name: 'Driving Support', rate: 25, unit: 'hr', quantity: totalHours, total: drivingTotal });
      subtotal += drivingTotal;
    }

    if (services.specialNeeds) {
      const specialNeedsRate = 50;
      const specialNeedsTotal = specialNeedsRate * totalHours;
      addOns.push({ name: 'Special Needs Support', rate: specialNeedsRate, unit: 'hr', quantity: totalHours, total: specialNeedsTotal });
      subtotal += specialNeedsTotal;
    }
    
    return { 
      baseRate, 
      totalHours, 
      dateBreakdown, 
      addOns, 
      bookingType: 'hourly',
      subtotal,
      serviceFee: 35,
      total: subtotal + 35
    };
  }
  
  // Daily bookings (temporary_support) - Gap Coverage with prorata monthly
  if (bookingSubType === 'temporary_support') {
    const selectedDates = schedule.selectedDates || [];
    const totalDays = selectedDates.length;
    const prorataMultiplier = totalDays / 30;
    
    // Get monthly rate based on home size (sleep-out = live_out)
    const normalizeHomeSize = (size?: string): string => {
      if (!size) return 'family_hub';
      const lower = size.toLowerCase().replace(/[- ]/g, '_');
      if (['pocket_palace', 'family_hub', 'grand_estate', 'monumental_manor', 'epic_estates'].includes(lower)) {
        return lower;
      }
      if (lower.includes('pocket') || lower === 'small') return 'pocket_palace';
      if (lower.includes('family') || lower === 'medium') return 'family_hub';
      if (lower.includes('grand') && !lower.includes('epic')) return 'grand_estate';
      if (lower.includes('monumental') || lower === 'extra_large') return 'monumental_manor';
      if (lower.includes('epic')) return 'epic_estates';
      return 'family_hub';
    };
    
    const sizeKey = normalizeHomeSize(homeSize);
    const monthlyRates: Record<string, number> = {
      pocket_palace: 4800,
      family_hub: 6800,
      grand_estate: 7800,
      monumental_manor: 9000,
      epic_estates: 11000
    };
    
    const monthlyRate = monthlyRates[sizeKey] || monthlyRates.family_hub;
    const prorataBaseRate = monthlyRate * prorataMultiplier;
    
    // Calculate add-ons (prorata monthly rates)
    const addOns = [];
    let subtotal = prorataBaseRate;
    
    if (services.cooking) {
      const cookingMonthly = 1500;
      const prorataCooking = cookingMonthly * prorataMultiplier;
      addOns.push({ 
        name: 'Cooking', 
        rate: cookingMonthly, 
        unit: 'month (prorata)', 
        quantity: prorataMultiplier, 
        total: prorataCooking 
      });
      subtotal += prorataCooking;
    }
    
    if (services.householdSupport?.includes('light-housekeeping') || services.lightHousekeeping) {
      const dailyRates: Record<string, number> = {
        pocket_palace: 80,
        family_hub: 100,
        grand_estate: 120,
        monumental_manor: 140,
        epic_estates: 300
      };
      const dailyRate = dailyRates[sizeKey] || dailyRates.family_hub;
      const monthlyHousekeeping = dailyRate * 30;
      const prorataHousekeeping = monthlyHousekeeping * prorataMultiplier;
      addOns.push({ 
        name: `Light Housekeeping (${getHomeSizeDisplayName(homeSize)})`, 
        rate: monthlyHousekeeping, 
        unit: 'month (prorata)', 
        quantity: prorataMultiplier, 
        total: prorataHousekeeping 
      });
      subtotal += prorataHousekeeping;
    }

    if (services.drivingSupport) {
      const drivingMonthly = 1500;
      const prorataDriving = drivingMonthly * prorataMultiplier;
      addOns.push({ 
        name: 'Driving Support', 
        rate: drivingMonthly, 
        unit: 'month (prorata)', 
        quantity: prorataMultiplier, 
        total: prorataDriving 
      });
      subtotal += prorataDriving;
    }

    if (services.specialNeeds) {
      const diverseAbilityMonthly = 1500;
      const prorataDiverseAbility = diverseAbilityMonthly * prorataMultiplier;
      addOns.push({ 
        name: 'Diverse Ability Support', 
        rate: diverseAbilityMonthly, 
        unit: 'month (prorata)', 
        quantity: prorataMultiplier, 
        total: prorataDiverseAbility 
      });
      subtotal += prorataDiverseAbility;
    }
    
    const placementFee = 1500; // R1,500 placement fee (payable first)
    const prorataAmount = subtotal; // Total prorata amount (payable at end)
    
    // Create date breakdown for display (showing daily equivalent for reference)
    const dateBreakdown = selectedDates.map((dateStr: string) => {
      const date = parseISO(dateStr);
      const dailyEquivalent = prorataAmount / totalDays;
      return { 
        date: format(date, 'MMM dd, yyyy (EEE)'), 
        rate: dailyEquivalent, 
        isWeekend: false // Not relevant for prorata
      };
    });
    
    return { 
      weekdayTotal: 0, // Not applicable for prorata
      weekendTotal: 0, // Not applicable for prorata
      totalDays, 
      weekdayCount: 0,
      weekendCount: 0,
      dateBreakdown, 
      addOns, 
      bookingType: 'daily', 
      serviceFeeWaived: true, // Placement fee replaces service fee
      subtotal: prorataAmount,
      total: prorataAmount,
      placementFee,
      prorataAmount,
      monthlyRate,
      prorataMultiplier
    };
  }
  
  return null;
};

// Helper function to format long-term schedule
const formatLongTermSchedule = (schedule: any) => {
  if (!schedule) return [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.map(day => ({
    day: day.charAt(0).toUpperCase() + day.slice(1),
    active: schedule[day] === true
  }));
};

export const BookingDetailsDialog: React.FC<BookingDetailsDialogProps> = ({
  open,
  onOpenChange,
  booking
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!booking) return null;

  const handlePaymentVerification = async (status: 'approved' | 'rejected') => {
    if (!booking.payment_proofs || booking.payment_proofs.length === 0) {
      toast.error('No payment proof found');
      return;
    }

    setIsProcessing(true);
    try {
      const proofId = booking.payment_proofs[0].id;
      
      // Update payment proof status
      const { error: proofError } = await supabase
        .from('payment_proofs')
        .update({
          verification_status: status,
          admin_notes: adminNotes,
          verified_at: new Date().toISOString()
        })
        .eq('id', proofId);

      if (proofError) throw proofError;

      // Update booking status
      const newBookingStatus = status === 'approved' ? 'confirmed' : 'cancelled';
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: newBookingStatus,
          notes: `Payment ${status}. ${adminNotes || ''}`
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Create notification for client
      await supabase.from('notifications').insert({
        user_id: booking.client_id || booking.clients?.id,
        title: `Payment ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: status === 'approved' 
          ? 'Your payment has been verified and your booking is now confirmed!'
          : `Your payment was rejected. ${adminNotes || 'Please contact support for more information.'}`,
        type: 'payment_verification',
        data: {
          booking_id: booking.id,
          status: status
        }
      });

      toast.success(`Payment ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const clientName = `${booking.clients?.profiles?.first_name || ''} ${booking.clients?.profiles?.last_name || ''}`.trim();
  const nannyName = `${booking.nannies?.profiles?.first_name || ''} ${booking.nannies?.profiles?.last_name || ''}`.trim();
  const clientEmail = booking.clients?.profiles?.email;
  const clientPhone = booking.clients?.profiles?.phone;
  const clientLocation = booking.clients?.profiles?.location;
  const numberOfChildren = booking.clients?.number_of_children || 0;
  const otherDependents = booking.clients?.other_dependents || 0;
  const homeSize = booking.clients?.home_size || booking.home_size;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'active': return 'default';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getBookingTypeDisplay = (type: string) => {
    const types = {
      'emergency': { label: 'Emergency', color: 'destructive' },
      'date_night': { label: 'Date Night', color: 'secondary' },
      'date_day': { label: 'Day Care', color: 'outline' },
      'school_holiday': { label: 'School Holiday', color: 'default' },
      'temporary_support': { label: 'Temporary Support', color: 'default' },
      'long_term': { label: 'Long Term', color: 'default' },
      'standard': { label: 'Standard', color: 'outline' }
    };
    return types[type as keyof typeof types] || types['standard'];
  };

  const bookingType = getBookingTypeDisplay(booking.booking_type);
  const isLongTerm = booking.booking_type === 'long_term';
  const shortTermBreakdown = !isLongTerm ? calculateShortTermBreakdown(booking) : null;
  const longTermSchedule = isLongTerm ? formatLongTermSchedule(booking.schedule) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Booking Details - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={bookingType.color as any}>
              {bookingType.label}
            </Badge>
            <Badge variant={getStatusColor(booking.status)}>
              {booking.status}
            </Badge>
            <span className="text-muted-foreground text-sm">
              ID: {booking.id.slice(0, 8)}...
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enhanced Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{clientName}</span>
                </div>
                {clientEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm break-all">{clientEmail}</span>
                  </div>
                )}
                {clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{clientPhone}</span>
                  </div>
                )}
                {clientLocation && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{formatLocationAddress(clientLocation)}</span>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">{numberOfChildren}</span> {numberOfChildren === 1 ? 'child' : 'children'}
                      {otherDependents > 0 && (
                        <>, <span className="font-medium">{otherDependents}</span> other {otherDependents === 1 ? 'occupant' : 'occupants'}</>
                      )}
                    </span>
                  </div>
                  {homeSize && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{getHomeSizeDisplayName(homeSize)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Nanny Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Nanny Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{nannyName}</span>
                </div>
                {booking.nannies?.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm">{booking.nannies.rating}/5.0</span>
                  </div>
                )}
                {booking.nannies?.experience_level && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{booking.nannies.experience_level} years experience</span>
                  </div>
                )}
                {booking.nannies?.hourly_rate && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{formatCurrency(booking.nannies.hourly_rate)}/hour</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(booking.start_date), 'MMM dd, yyyy')}</p>
                </div>
                {booking.end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">{format(new Date(booking.end_date), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(booking.created_at), 'MMM dd, yyyy')}</p>
                </div>
                {booking.living_arrangement && (
                  <div>
                    <p className="text-sm text-muted-foreground">Living Arrangement</p>
                    <p className="font-medium capitalize">{booking.living_arrangement.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NEW: Booking Specifics Section */}
          {shortTermBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Booking Specifics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {shortTermBreakdown.bookingType === 'hourly' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Hourly Rate:</span>
                        <span className="font-medium">{formatCurrency(shortTermBreakdown.baseRate)}/hr</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Hours:</span>
                        <span className="font-medium">{shortTermBreakdown.totalHours} hours</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-2">Dates & Times:</p>
                      <div className="space-y-1.5 bg-muted/50 p-3 rounded-md">
                        {shortTermBreakdown.dateBreakdown.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm flex justify-between">
                            <span>{item.date}:</span>
                            <span className="text-muted-foreground">{item.start} - {item.end} ({item.hours}hrs)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {shortTermBreakdown.addOns.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Add-on Services:</p>
                          <div className="space-y-1.5">
                            {shortTermBreakdown.addOns.map((addon: any, idx: number) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>{addon.name}:</span>
                                <span className="text-muted-foreground">
                                  {formatCurrency(addon.rate)}/{addon.unit} × {addon.quantity} = {formatCurrency(addon.total)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="space-y-1.5 bg-primary/5 p-3 rounded-md">
                      <div className="flex justify-between text-sm">
                        <span>Base Rate:</span>
                        <span>{formatCurrency(shortTermBreakdown.baseRate)}/hr × {shortTermBreakdown.totalHours}hrs = {formatCurrency(shortTermBreakdown.baseRate * shortTermBreakdown.totalHours)}</span>
                      </div>
                      {shortTermBreakdown.addOns.map((addon: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{addon.name}:</span>
                          <span>{formatCurrency(addon.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm">
                        <span>Service Fee:</span>
                        <span>{formatCurrency(shortTermBreakdown.serviceFee)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(shortTermBreakdown.total)}</span>
                      </div>
                    </div>
                  </>
                )}

                {shortTermBreakdown.bookingType === 'daily' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Daily Rate:</span>
                        <span className="font-medium">{formatCurrency(280)}/weekday or {formatCurrency(350)}/weekend</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Days:</span>
                        <span className="font-medium">{shortTermBreakdown.totalDays} days ({shortTermBreakdown.weekdayCount} weekdays, {shortTermBreakdown.weekendCount} weekends)</span>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-2">Dates Breakdown:</p>
                      <div className="space-y-1.5 bg-muted/50 p-3 rounded-md max-h-48 overflow-y-auto">
                        {shortTermBreakdown.dateBreakdown.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm flex justify-between">
                            <span>{item.date}:</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(item.rate)} {item.isWeekend ? '(Weekend)' : '(Weekday)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {shortTermBreakdown.addOns.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Add-on Services:</p>
                          <div className="space-y-1.5">
                            {shortTermBreakdown.addOns.map((addon: any, idx: number) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>{addon.name}:</span>
                                <span className="text-muted-foreground">
                                  {formatCurrency(addon.rate)}/{addon.unit} × {addon.quantity} = {formatCurrency(addon.total)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="space-y-1.5 bg-primary/5 p-3 rounded-md">
                      <div className="flex justify-between text-sm">
                        <span>Weekdays ({shortTermBreakdown.weekdayCount} days):</span>
                        <span>{formatCurrency(280)} × {shortTermBreakdown.weekdayCount} = {formatCurrency(shortTermBreakdown.weekdayTotal)}</span>
                      </div>
                      {shortTermBreakdown.weekendCount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Weekends ({shortTermBreakdown.weekendCount} days):</span>
                          <span>{formatCurrency(350)} × {shortTermBreakdown.weekendCount} = {formatCurrency(shortTermBreakdown.weekendTotal)}</span>
                        </div>
                      )}
                      {shortTermBreakdown.addOns.map((addon: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{addon.name}:</span>
                          <span>{formatCurrency(addon.total)}</span>
                        </div>
                      ))}
                      {shortTermBreakdown.serviceFeeWaived && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Service Fee:</span>
                          <span>WAIVED (5+ days)</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(shortTermBreakdown.total)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Long-Term Booking Specifics */}
          {isLongTerm && longTermSchedule && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Booking Specifics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Base Rate:</span>
                    <span className="font-medium">{formatCurrency(booking.base_rate)}/month</span>
                  </div>
                  {homeSize && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Home Size:</span>
                      <span className="font-medium">{getHomeSizeDisplayName(homeSize)}</span>
                    </div>
                  )}
                  {booking.living_arrangement && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Living Arrangement:</span>
                      <span className="font-medium capitalize">{booking.living_arrangement.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Weekly Schedule:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {longTermSchedule.map((dayInfo) => (
                      <div key={dayInfo.day} className="flex items-center gap-2 text-sm">
                        {dayInfo.active ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className={dayInfo.active ? 'font-medium' : 'text-muted-foreground'}>
                          {dayInfo.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {booking.services && Object.keys(booking.services).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Additional Services:</p>
                      <div className="space-y-1.5">
                        {booking.services.cooking && (
                          <div className="text-sm flex justify-between">
                            <span>Cooking:</span>
                            <span className="text-muted-foreground">{formatCurrency(1500)}/month</span>
                          </div>
                        )}
                        {booking.services.specialNeeds && (
                          <div className="text-sm flex justify-between">
                            <span>Special Needs Support:</span>
                            <span className="text-muted-foreground">{formatCurrency(2000)}/month</span>
                          </div>
                        )}
                        {booking.services.drivingSupport && (
                          <div className="text-sm flex justify-between">
                            <span>Driving Support:</span>
                            <span className="text-muted-foreground">{formatCurrency(1800)}/month</span>
                          </div>
                        )}
                        {booking.services.ecdTraining && (
                          <div className="text-sm flex justify-between">
                            <span>ECD Training:</span>
                            <span className="text-muted-foreground">{formatCurrency(500)}/month</span>
                          </div>
                        )}
                        {booking.services.montessori && (
                          <div className="text-sm flex justify-between">
                            <span>Montessori Training:</span>
                            <span className="text-muted-foreground">{formatCurrency(450)}/month</span>
                          </div>
                        )}
                        {booking.services.backupNanny && (
                          <div className="text-sm flex justify-between">
                            <span>Backup Nanny:</span>
                            <span className="text-muted-foreground">{formatCurrency(100)}/month</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {(numberOfChildren > 2 || otherDependents > 0) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Extra Charges:</p>
                      <div className="space-y-1.5">
                        {numberOfChildren > 2 && (
                          <div className="text-sm flex justify-between">
                            <span>Extra children ({numberOfChildren - 2}):</span>
                            <span className="text-muted-foreground">{formatCurrency((numberOfChildren - 2) * 500)}/month</span>
                          </div>
                        )}
                        {otherDependents > 0 && (
                          <div className="text-sm flex justify-between">
                            <span>Other occupants ({otherDependents}):</span>
                            <span className="text-muted-foreground">{formatCurrency(otherDependents * 150)}/month</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-1.5 bg-primary/5 p-3 rounded-md">
                  <div className="flex justify-between font-bold">
                    <span>MONTHLY TOTAL:</span>
                    <span>{formatCurrency(booking.total_monthly_cost || booking.base_rate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Information */}
          <RevenueBreakdown
            bookingType={booking.booking_type === 'long_term' ? 'long_term' : 'short_term'}
            totalAmount={booking.total_monthly_cost || 0}
            monthlyRateEstimate={booking.base_rate}
            bookingDays={booking.booking_type === 'short_term' && booking.start_date && booking.end_date ? 
              Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1}
            homeSize={booking.home_size}
          />

          {/* Payment Proof Section */}
          {booking.payment_proofs && booking.payment_proofs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Payment Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.payment_proofs.map((proof: any) => (
                  <div key={proof.id} className="space-y-3 border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Reference: {proof.payment_reference}</p>
                        <p className="text-sm text-muted-foreground">
                          Amount: R{proof.amount?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {format(new Date(proof.created_at), 'PPp')}
                        </p>
                      </div>
                      <Badge variant={
                        proof.verification_status === 'approved' ? 'default' :
                        proof.verification_status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {proof.verification_status}
                      </Badge>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(proof.proof_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Payment Proof
                    </Button>

                    {proof.admin_notes && (
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">Admin Notes:</p>
                        <p className="text-sm text-muted-foreground">{proof.admin_notes}</p>
                      </div>
                    )}

                    {proof.verification_status === 'pending' && (
                      <div className="space-y-3 pt-3">
                        <Textarea
                          placeholder="Add admin notes (optional)..."
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePaymentVerification('approved')}
                            disabled={isProcessing}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Payment
                          </Button>
                          <Button
                            onClick={() => handlePaymentVerification('rejected')}
                            disabled={isProcessing}
                            variant="destructive"
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Payment
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

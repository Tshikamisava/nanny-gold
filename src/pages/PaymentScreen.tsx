import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@/contexts/BookingContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, isHourlyBasedBooking, isDailyBasedBooking, calculateHourlyPricing, calculateDailyPricing, type HourlyPricingResult } from "@/utils/pricingUtils";
import { PlacementFeeDialog } from "@/components/PlacementFeeDialog";
import { extractBookingDetails, cleanPreferences } from "@/utils/valueUtils";
import { calculateAndStoreBookingFinancials } from "@/services/bookingService";
const PaymentScreen = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [hourlyPricing, setHourlyPricing] = useState<HourlyPricingResult | null>(null);
  const [showPlacementDialog, setShowPlacementDialog] = useState(false);
  const [placementFeeAccepted, setPlacementFeeAccepted] = useState(false);
  const {
    calculateNannySpecificPricing,
    selectedNanny,
    preferences,
    updatePreferences
  } = useBooking();

  // Extract booking details safely without creating circular references
  const {
    bookingSubType,
    // durationType unused here
    selectedDates,
    timeSlots
  } = useMemo(() => extractBookingDetails(preferences), [preferences]);

  // Clean preferences for calculations
  const cleanedPreferences = useMemo(() => cleanPreferences(preferences), [preferences]);

  // Check booking type with cleaned preferences
  const isHourlyBooking = cleanedPreferences?.bookingSubType && isHourlyBasedBooking(cleanedPreferences.bookingSubType);
  const isDailyBooking = cleanedPreferences?.bookingSubType && isDailyBasedBooking(cleanedPreferences.bookingSubType);

  const isLongTermBooking = (() => {
    // Primary check: explicit durationType - THIS TAKES PRECEDENCE
    if (cleanedPreferences?.durationType === 'long_term') {
      console.log('✅ Long-term booking confirmed by durationType');
      return true;
    }

    // Secondary check: exclude known short-term booking types ONLY if durationType is not long_term
    const shortTermTypes = ['date_night', 'date_day', 'emergency', 'temporary_support', 'school_holiday'];
    if (cleanedPreferences?.bookingSubType && shortTermTypes.includes(cleanedPreferences.bookingSubType)) {
      console.log('❌ Short-term booking detected by bookingSubType:', cleanedPreferences.bookingSubType);
      return false;
    }

    // Tertiary check: if durationType is explicitly short_term
    if (cleanedPreferences?.durationType === 'short_term') {
      return false;
    }

    // Quaternary check: presence of long-term indicators
    if (cleanedPreferences?.livingArrangement && cleanedPreferences?.homeSize) {
      return true;
    }

    // Final fallback: Check URL or localStorage for booking flow context
    try {
      const urlPath = window.location.pathname;
      const bookingFlow = localStorage.getItem('bookingFlow');

      if (urlPath.includes('living-arrangement') || bookingFlow === 'long-term') {
        return true;
      }
    } catch (error) {
      console.error('Error checking booking flow context:', error);
    }

    // Default to false if we can't determine
    console.warn('⚠️ Could not determine booking type, defaulting to short-term');
    return false;
  })();

  const hourlyServices = useMemo(() => ({
    cooking: cleanedPreferences?.cooking || false,
    specialNeeds: cleanedPreferences?.specialNeeds || false,
    drivingSupport: cleanedPreferences?.drivingSupport || false,
    lightHousekeeping: cleanedPreferences?.householdSupport?.includes('light-housekeeping') || false
  }), [
    cleanedPreferences?.cooking,
    cleanedPreferences?.specialNeeds,
    cleanedPreferences?.drivingSupport,
    Array.isArray(cleanedPreferences?.householdSupport)
      ? cleanedPreferences?.householdSupport.join(',')
      : cleanedPreferences?.householdSupport
  ]);

  const limitedSelectedDates = useMemo(() => {
    if (!selectedDates || !Array.isArray(selectedDates)) return [];
    return selectedDates.slice(0, 30);
  }, [selectedDates]);

  const totalHours = useMemo(() => {
    if (!bookingSubType) {
      return 0;
    }

    const calculateSlotHours = () => {
      if (!timeSlots || timeSlots.length === 0) return 0;
      return timeSlots.reduce((total: number, slot: any) => {
        const start = new Date(`2000-01-01T${slot.start}:00`);
        const end = new Date(`2000-01-01T${slot.end}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + Math.max(hours, 0);
      }, 0);
    };

    if (bookingSubType === 'date_night') {
      const baseHours = calculateSlotHours();
      if (baseHours > 0 && selectedDates) {
        return baseHours * Math.min(selectedDates.length, 10);
      }
      return Math.min(selectedDates ? selectedDates.length : 1, 10) * 4;
    }

    if (bookingSubType === 'date_day') {
      const baseHours = calculateSlotHours();
      if (baseHours > 0 && selectedDates) {
        return baseHours * Math.min(selectedDates.length, 30);
      }
      const validDates = Math.min(selectedDates ? selectedDates.length : 1, 30);
      return validDates * 8;
    }

    if (bookingSubType === 'emergency') {
      const baseHours = calculateSlotHours();
      if (baseHours > 0 && selectedDates) {
        return Math.max(5, baseHours * Math.min(selectedDates.length, 3));
      }
      const validDates = Math.min(selectedDates ? selectedDates.length : 1, 3);
      return Math.max(5, validDates * 5);
    }

    if (bookingSubType === 'school_holiday') {
      const baseHours = calculateSlotHours();
      if (baseHours > 0 && selectedDates) {
        return baseHours * Math.min(selectedDates.length, 15);
      }
      const validDates = Math.min(selectedDates ? selectedDates.length : 1, 15);
      return validDates * 6;
    }

    return calculateSlotHours();
  }, [bookingSubType, timeSlots, selectedDates]);

  const hourlyPricingKey = useMemo(() => {
    if (!isHourlyBooking || !bookingSubType) return null;
    return JSON.stringify({
      bookingSubType,
      totalHours,
      services: hourlyServices,
      selectedDates: limitedSelectedDates,
      homeSize: cleanedPreferences?.homeSize
    });
  }, [isHourlyBooking, bookingSubType, totalHours, hourlyServices, limitedSelectedDates, cleanedPreferences?.homeSize]);

  const lastHourlyKeyRef = useRef<string | null>(null);


  console.log('🔍 Booking type classification:', {
    durationType: cleanedPreferences?.durationType,
    bookingSubType: cleanedPreferences?.bookingSubType,
    livingArrangement: cleanedPreferences?.livingArrangement,
    homeSize: cleanedPreferences?.homeSize,
    isLongTermBooking,
    isHourlyBooking,
    isDailyBooking
  });

  // Calculate pricing based on booking type
  // Calculate payable amount directly from the pricing objects displayed on screen
  // This ensures we use the exact same values shown on the "Pay R..." button
  const calculatePayableAmount = (): number => {
    // Long-term: placement fee is what's due today
    if (isLongTermBooking && monthlyPricing) {
      return placementFee;
    }

    // Short-term hourly: total from hourlyPricing
    if (isHourlyBooking && hourlyPricing && hourlyPricing.total > 0) {
      return hourlyPricing.total;
    }

    // Short-term daily: total from dailyPricing
    if (isDailyBooking && dailyPricing && dailyPricing.total > 0) {
      return dailyPricing.total;
    }

    // Fallback: should never reach here if pricing is loaded
    console.warn('⚠️ No pricing available for amount calculation');
    return 0;
  };

  const buildPricingPayload = () => {
    if (isLongTermBooking && monthlyPricing) {
      return {
        type: 'monthly' as const,
        baseRate: monthlyPricing.baseRate,
        addOns: monthlyPricing.addOns,
        total: monthlyPricing.total,
        breakdown: monthlyPricing,
        placementFee: placementFee
      };
    }

    if (isHourlyBooking && hourlyPricing) {
      return {
        type: 'hourly' as const,
        baseRate: hourlyPricing.baseHourlyRate,
        addOns: hourlyPricing.services || [],
        total: hourlyPricing.total,
        totalHours: totalHours,
        breakdown: hourlyPricing
      };
    }

    if (isDailyBooking && dailyPricing) {
      return {
        type: 'daily' as const,
        baseRate: dailyPricing.total / (dailyPricing.breakdown?.length || 1),
        addOns: [],
        total: dailyPricing.total,
        breakdown: dailyPricing
      };
    }

    return null;
  };

  useEffect(() => {
    if (!hourlyPricingKey) {
      if (isHourlyBooking) {
        setHourlyPricing(null);
      }
      setIsPricingLoading(false);
      return;
    }

    if (hourlyPricing && lastHourlyKeyRef.current === hourlyPricingKey) {
      setIsPricingLoading(false);
      return;
    }

    let isActive = true;
    setIsPricingLoading(true);

    const fetchHourlyPricing = async () => {
      try {
        const pricing = await calculateHourlyPricing(
          bookingSubType as 'emergency' | 'date_night' | 'date_day' | 'school_holiday',
          totalHours,
          hourlyServices,
          limitedSelectedDates,
          cleanedPreferences?.homeSize
        );

        if (isActive) {
          setHourlyPricing(pricing);
          lastHourlyKeyRef.current = hourlyPricingKey;
        }
      } catch (error) {
        if (isActive) {
          console.error('⚠️ Pricing calculation error:', error);
          lastHourlyKeyRef.current = null;
          setHourlyPricing(null);
        }
      } finally {
        if (isActive) {
          setIsPricingLoading(false);
        }
      }
    };

    fetchHourlyPricing();

    return () => {
      isActive = false;
    };
  }, [hourlyPricingKey, isHourlyBooking, bookingSubType, totalHours, hourlyServices, limitedSelectedDates, cleanedPreferences?.homeSize, hourlyPricing]);

  // Calculate pricing based on booking type and user selections
  const pricing = isLongTermBooking ? calculateNannySpecificPricing(selectedNanny) : null;



  const { loadProfileFromDatabase } = useBooking();

  // Force load profile if preferences are empty but user exists
  useEffect(() => {
    if (user && isLongTermBooking && (!preferences.homeSize || !preferences.livingArrangement)) {
      loadProfileFromDatabase();
    }
  }, [user, isLongTermBooking, preferences.homeSize, preferences.livingArrangement, loadProfileFromDatabase]);

  // CRITICAL: Only use actual calculated pricing - NO HARDCODED FALLBACKS
  // This prevents the screen from showing incorrect pricing
  const monthlyPricing = pricing;

  // Calculate placement fee based on home size
  const calculatePlacementFee = (homeSize: string, baseRate: number): number => {
    const mappedSize = homeSize?.toLowerCase().replace(/[- ]/g, '_') || 'family_hub';

    // Flat R2,500 for standard homes (Pocket Palace, Family Hub)
    if (['pocket_palace', 'family_hub'].includes(mappedSize)) {
      return 2500;
    }

    // 50% of base rate for premium estates (Grand Estate, Monumental Manor, Epic Estates)
    if (['grand_estate', 'monumental_manor', 'epic_estates'].includes(mappedSize)) {
      return Math.round(baseRate * 0.5);
    }

    return 2500; // Default fallback
  };

  const placementFee = isLongTermBooking && monthlyPricing
    ? calculatePlacementFee(cleanedPreferences.homeSize, monthlyPricing.baseRate)
    : 0;

  // Calculate daily pricing for temporary support
  const dailyPricing = useMemo(() => {
    if (!isDailyBooking || !selectedDates || !bookingSubType) {
      return null;
    }
    return calculateDailyPricing(selectedDates, bookingSubType, preferences.homeSize, {
      cooking: cleanedPreferences?.cooking,
      specialNeeds: cleanedPreferences?.specialNeeds,
      drivingSupport: cleanedPreferences?.drivingSupport,
      lightHousekeeping: cleanedPreferences?.householdSupport?.includes('light-housekeeping') || false
    });
  }, [
    isDailyBooking,
    selectedDates,
    bookingSubType,
    preferences.homeSize,
    cleanedPreferences?.cooking,
    cleanedPreferences?.specialNeeds,
    cleanedPreferences?.drivingSupport,
    cleanedPreferences?.householdSupport
  ]);
  
  // Gap Coverage placement fee (R2,500) - payable first
  const gapCoveragePlacementFee = isDailyBooking && bookingSubType === 'temporary_support' && dailyPricing?.placementFee
    ? dailyPricing.placementFee
    : 0;
  const isHourlyPricingPending = isPricingLoading && !hourlyPricing;
  const isDailyPricingPending = isPricingLoading && !dailyPricing;

  const selectedNannyName = selectedNanny?.profiles ? `${selectedNanny.profiles.first_name} ${selectedNanny.profiles.last_name}` : 'Selected Nanny';
  // Removed card processing - payment now goes directly to EFT

  const handlePayment = async () => {
    if (!user || !selectedNanny) {
      toast({
        title: "Error",
        description: "Please select a nanny before proceeding to payment",
        variant: "destructive"
      });
      return;
    }

    // Validate hourly booking pricing
    if (isHourlyBooking && !hourlyPricing) {
      toast({
        title: "Pricing Error",
        description: "Pricing is still calculating. Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }

    // Validate daily booking pricing
    if (isDailyBooking && !dailyPricing) {
      toast({
        title: "Pricing Error",
        description: "Pricing is still calculating. Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }

    // Validate long-term booking data
    if (isLongTermBooking) {
      if (!monthlyPricing) {
        toast({
          title: "Pricing Error",
          description: "Unable to calculate pricing. Please go back and verify your selections.",
          variant: "destructive"
        });
        return;
      }

      if (!cleanedPreferences?.homeSize || !cleanedPreferences?.livingArrangement) {
        toast({
          title: "Missing Information",
          description: "Please complete your home size and living arrangement selections.",
          variant: "destructive"
        });
        return;
      }
    }

    // CRITICAL: Validate durationType before proceeding
    if (!cleanedPreferences?.durationType) {
      toast({
        title: "Configuration Error",
        description: "Booking type is not set. Please go back and select your booking type.",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💳 Creating booking with data:', {
        userId: user.id,
        nannyId: selectedNanny.id,
        durationType: cleanedPreferences?.durationType,
        isLongTerm: isLongTermBooking,
        pricing: monthlyPricing,
        livingArrangement: cleanedPreferences?.livingArrangement,
        homeSize: cleanedPreferences?.homeSize
      });

      // Create booking record first
      const bookingData: any = {
        client_id: user.id,
        nanny_id: selectedNanny.id,
        status: 'pending',
        start_date: cleanedPreferences?.startDate || new Date().toISOString().split('T')[0],
        booking_type: isLongTermBooking ? 'long_term' : isHourlyBooking ? 'short_term_hourly' : 'short_term_daily',
        services: {
          cooking: cleanedPreferences?.cooking || false,
          specialNeeds: cleanedPreferences?.specialNeeds || false,
          drivingSupport: cleanedPreferences?.drivingSupport || false,
          lightHousekeeping: cleanedPreferences?.householdSupport?.includes('light-housekeeping') || false
        }
      };

      // Add booking type specific data
      if (isLongTermBooking && monthlyPricing) {
        bookingData.total_monthly_cost = monthlyPricing.total;
        bookingData.base_rate = monthlyPricing.baseRate;
        bookingData.home_size = cleanedPreferences?.homeSize;
        bookingData.living_arrangement = cleanedPreferences?.livingArrangement;
      } else if (isHourlyBooking && hourlyPricing) {
        bookingData.total_monthly_cost = hourlyPricing.total;
        bookingData.base_rate = hourlyPricing.baseHourlyRate;
        bookingData.schedule = {
          selectedDates: selectedDates,
          timeSlots: timeSlots,
          bookingSubType: bookingSubType
        };
      } else if (isDailyBooking && dailyPricing) {
        bookingData.total_monthly_cost = dailyPricing.total;
        bookingData.base_rate = dailyPricing.total / (dailyPricing.breakdown?.length || 1);
        bookingData.schedule = {
          selectedDates: selectedDates,
          timeSlots: timeSlots,
          bookingSubType: bookingSubType
        };
      }

      console.log('💳 Creating booking - Full Debug:', {
        bookingData,
        isHourlyBooking,
        hourlyPricing,
        isDailyBooking,
        dailyPricing,
        isLongTermBooking,
        monthlyPricing
      });
      console.log('📝 Inserting booking data:', bookingData);

      // Check for existing pending bookings with same nanny within last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id, created_at')
        .eq('client_id', user.id)
        .eq('nanny_id', selectedNanny.id)
        .eq('status', 'pending')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingBookings && existingBookings.length > 0) {
        console.log('✅ Found existing pending booking, redirecting to EFT payment');
        const pricingData = buildPricingPayload();
        const amountDue = calculatePayableAmount();
        console.log('💰 Existing booking - Amount due:', amountDue, {
          isLongTermBooking,
          isHourlyBooking,
          isDailyBooking,
          hourlyPricing: hourlyPricing?.total,
          dailyPricing: dailyPricing?.total,
          placementFee
        });
        navigate('/eft-payment', {
          state: {
            bookingId: existingBookings[0].id,
            pricingData,
            amount: amountDue,
            nannyName: selectedNannyName,
            bookingType: isLongTermBooking ? 'long_term' : isHourlyBooking ? 'hourly' : 'daily'
          }
        });
        setIsProcessing(false);
        return;
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('❌ Booking creation error:', bookingError);
        throw new Error(bookingError.message || 'Failed to create booking');
      }

      console.log('✅ Booking created:', booking.id);

      try {
        const amountForFinancials = isLongTermBooking && monthlyPricing
          ? monthlyPricing.total
          : isHourlyBooking && hourlyPricing
            ? hourlyPricing.total
            : isDailyBooking && dailyPricing
              ? dailyPricing.total
              : 0;

        const bookingTypeForFinancials = isLongTermBooking
          ? 'long_term'
          : isHourlyBooking
            ? 'short_term_hourly'
            : 'short_term_daily';

        if (amountForFinancials > 0) {
          await calculateAndStoreBookingFinancials(
            booking.id,
            amountForFinancials,
            bookingTypeForFinancials,
            isLongTermBooking ? monthlyPricing?.total : amountForFinancials
          );
        }
      } catch (financialError) {
        console.error('Error preparing booking financials:', financialError);
      }

      // Pass comprehensive pricing data to EFT screen with booking ID
      const pricingData = buildPricingPayload();
      const amountDue = calculatePayableAmount();

      console.log('💰 Pre-navigation pricing check:', {
        isHourlyBooking,
        hourlyPricing: hourlyPricing?.total,
        isDailyBooking,
        dailyPricing: dailyPricing?.total,
        isLongTermBooking,
        monthlyPricing: monthlyPricing?.total,
        placementFee,
        amountDue,
        pricingDataTotal: pricingData?.total,
        pricingDataPlacementFee: pricingData?.placementFee
      });

      console.log('💰 Navigating to EFT with pricing:', {
        pricingData,
        amount: amountDue,
        bookingType: isLongTermBooking ? 'long_term' : isHourlyBooking ? 'hourly' : 'daily'
      });

      // Redirect to EFT payment screen with booking ID and explicit amount
      // CRITICAL: amountDue is calculated directly from the pricing objects shown on screen
      navigate('/eft-payment', {
        state: {
          bookingId: booking.id,
          pricingData,
          amount: amountDue, // This is the exact amount shown on the "Pay R..." button
          nannyName: selectedNannyName,
          bookingType: isLongTermBooking ? 'long_term' : isHourlyBooking ? 'hourly' : 'daily'
        }
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  return <div className="min-h-screen bg-background px-6 py-8">
    <div className="max-w-sm mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/match-results')} className="text-primary hover:bg-accent">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
          <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
          <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
          <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
          <div className="w-2 h-2 bg-secondary rounded-full"></div>
        </div>
        <div className="w-10 h-10"></div> {/* Spacer */}
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Payment Summary
        </h1>
        <p className="text-muted-foreground">
          Booking with {selectedNannyName}
        </p>
      </div>

      <Card className="rounded-xl royal-shadow mb-6 border-border">
        <CardHeader className="bg-primary/5 rounded-t-xl border-b border-border">
          <CardTitle className="text-primary">Service Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {isHourlyBooking && hourlyPricing ?
            // Hourly pricing breakdown
            <>
              {preferences?.bookingSubType !== 'date_day' && <div className="flex justify-between">
                <span className="text-foreground">Base Hourly Rate</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(hourlyPricing.baseHourlyRate)}/hr
                </span>
              </div>}

              {/* BASE RATE SECTION - Shows first for date_day bookings */}
              {(preferences?.bookingSubType === 'date_day') && (
                <>
                  <div className="flex justify-between">
                    <span className="text-foreground">Hourly Care</span>
                    <span className="font-medium text-foreground">
                      {(() => {
                        // Calculate actual daily hours from time slots
                        const dailyHours = preferences.timeSlots?.reduce((total: number, slot: any) => {
                          const start = new Date(`2000-01-01T${slot.start}:00`);
                          const end = new Date(`2000-01-01T${slot.end}:00`);
                          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                          return total + hours;
                        }, 0) || 8;
                        return `${dailyHours}hrs × ${formatCurrency(hourlyPricing.baseHourlyRate)}/hr = ${formatCurrency(hourlyPricing.baseHourlyRate * dailyHours)}`;
                      })()}
                    </span>
                  </div>

                  {/* Day-of-week indicator */}
                  {selectedDates && selectedDates.length === 1 && (
                    <div className="flex justify-between text-sm text-muted-foreground pt-1">
                      <span>
                        {(() => {
                          const date = new Date(selectedDates[0]);
                          // Convert to SAST timezone (UTC+2) for accurate display
                          const sastOffset = 2 * 60;
                          const sastDate = new Date(date.getTime() + sastOffset * 60 * 1000);
                          const dayOfWeek = sastDate.getUTCDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
                          const dayName = sastDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
                          return `${dayName} (${isWeekend ? 'Weekend Rate: R55/hr' : 'Weekday Rate: R40/hr'})`;
                        })()}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* ADD-ON SERVICES SECTION - Shows second */}
              {hourlyPricing.services && hourlyPricing.services.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3 mt-3">
                  <h4 className="text-sm font-medium text-foreground">Add-on Services</h4>
                  {hourlyPricing.services.map((service, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Toggle service and recalculate pricing
                            const serviceKey = service.name.toLowerCase().includes('cooking') ? 'cooking' :
                              service.name.toLowerCase().includes('diverse') ? 'specialNeeds' :
                                service.name.toLowerCase().includes('driving') ? 'drivingSupport' :
                                  service.name.toLowerCase().includes('housekeeping') ? 'householdSupport' : null;

                            if (serviceKey && serviceKey !== 'householdSupport') {
                              updatePreferences({ [serviceKey]: false });
                            } else if (serviceKey === 'householdSupport') {
                              const current = preferences.householdSupport || [];
                              updatePreferences({
                                householdSupport: current.filter(item => item !== 'light-housekeeping')
                              });
                            }
                          }}
                          className="text-destructive hover:text-destructive p-1 h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{service.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {service.name.toLowerCase().includes('housekeeping') || service.name.toLowerCase().includes('cooking')
                              ? `${formatCurrency(service.hourlyRate || 0)}/day`
                              : `${formatCurrency(service.hourlyRate || 0)}/hr`
                            }
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        +{formatCurrency(service.totalCost || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex justify-between">
                  <span className="text-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(hourlyPricing.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(hourlyPricing.serviceFee)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold mb-6">
                  <span className="text-foreground">Total Cost</span>
                  <span className="text-secondary">
                    {formatCurrency(hourlyPricing.total)}
                  </span>
                </div>
              </div>



              <Button onClick={handlePayment} disabled={isProcessing || isHourlyPricingPending} className="w-full royal-gradient hover:opacity-90 text-white py-4 rounded-xl font-semibold text-lg shadow-lg">
                {isProcessing ? <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </> : isHourlyPricingPending ? <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calculating pricing...
                </> : `Pay R${hourlyPricing.total.toLocaleString()}`}
              </Button>
            </> : isDailyBooking && dailyPricing ?
              // Daily pricing breakdown (Gap Coverage with prorata)
              bookingSubType === 'temporary_support' ? (
                // Gap Coverage: Show prorata monthly calculation
                <>
                  <div className="flex justify-between">
                    <span className="text-foreground">Booking Period</span>
                    <span className="font-medium text-foreground">
                      {dailyPricing.prorataDays || dailyPricing.totalDays} days
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-foreground">Monthly Rate (Sleep-out)</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(dailyPricing.prorataMonthlyRate || dailyPricing.baseRate)}/month
                    </span>
                  </div>

                  {dailyPricing.prorataMultiplier && (
                    <div className="text-sm text-muted-foreground mb-3">
                      Prorata: {dailyPricing.prorataDays} days ÷ 30 = {dailyPricing.prorataMultiplier.toFixed(3)} × {formatCurrency(dailyPricing.prorataMonthlyRate || dailyPricing.baseRate)} = {formatCurrency(dailyPricing.prorataAmount || 0)}
                    </div>
                  )}

                  {/* Add-on Services */}
                  {dailyPricing.addOns && dailyPricing.addOns.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3 mt-3">
                      <h4 className="text-sm font-medium text-foreground">Add-on Services (Prorata)</h4>
                      {dailyPricing.addOns.map((addon, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-foreground">{addon.name}</span>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(addon.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-foreground">Prorata Service Fee</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(dailyPricing.prorataAmount || dailyPricing.total)}
                      </span>
                    </div>
                  </div>

                  {/* Payment breakdown for Gap Coverage */}
                  <div className="bg-primary/5 rounded-lg p-4 mb-4 border border-primary/20">
                    <h3 className="font-semibold text-foreground mb-3">Payment Schedule</h3>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-foreground">Due Today (Placement Fee)</span>
                      <span className="font-semibold text-secondary text-lg">
                        {formatCurrency(dailyPricing.placementFee || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Payable now to secure your booking
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="text-foreground">Due at End of Booking</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(dailyPricing.prorataAmount || dailyPricing.total)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prorata service fee payable at the end of the booking period
                    </p>
                  </div>

                  <Button 
                    onClick={handlePayment} 
                    disabled={isProcessing || isDailyPricingPending} 
                    className="w-full royal-gradient hover:opacity-90 text-white py-4 rounded-xl font-semibold text-lg shadow-lg"
                  >
                    {isProcessing ? <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </> : isDailyPricingPending ? <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Calculating pricing...
                    </> : `Pay ${formatCurrency(dailyPricing.placementFee || 0)} Placement Fee`}
                  </Button>
                </>
              ) : (
                // Other daily bookings (legacy)
                <>
                  <div className="flex justify-between">
                    <span className="text-foreground">Total Days</span>
                    <span className="font-medium text-foreground">
                      {dailyPricing.breakdown.length} days
                    </span>
                  </div>

                  {dailyPricing.breakdown.map((day, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString()} ({day.isWeekend ? 'Weekend' : 'Weekday'})
                      </span>
                      <span className="font-medium text-secondary">
                        {formatCurrency(day.rate)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-lg font-semibold mb-4">
                      <span className="text-foreground">Total Cost</span>
                      <span className="text-secondary">
                        {formatCurrency(dailyPricing.total)}
                      </span>
                    </div>

                    <Button onClick={handlePayment} disabled={isProcessing || isDailyPricingPending} className="w-full royal-gradient hover:opacity-90 text-white py-4 rounded-xl font-semibold text-lg shadow-lg">
                      {isProcessing ? <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </> : isDailyPricingPending ? <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Calculating pricing...
                      </> : `Pay R${dailyPricing.total.toLocaleString()}`}
                    </Button>
                  </div>
                </>
              ) : !isHourlyBooking && !isDailyBooking && monthlyPricing ?
                // Long-term booking breakdown with authorization/capture flow
                <>
                  <div className="flex justify-between">
                    <span className="text-foreground">Monthly Base Rate</span>
                    <span className="font-medium text-foreground">
                      R{monthlyPricing.baseRate.toLocaleString()}
                    </span>
                  </div>

                  {monthlyPricing.addOns && monthlyPricing.addOns.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3 mt-3">
                      <h4 className="text-sm font-medium text-foreground">Add-on Services</h4>
                      {monthlyPricing.addOns.map((addon, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Toggle service and recalculate pricing
                                const serviceKey = addon.name.toLowerCase().includes('cooking') || addon.name.toLowerCase().includes('food') ? 'cooking' :
                                  addon.name.toLowerCase().includes('diverse') || addon.name.toLowerCase().includes('special') ? 'specialNeeds' :
                                    addon.name.toLowerCase().includes('driving') ? 'drivingSupport' :
                                      addon.name.toLowerCase().includes('backup') ? 'backupNanny' :
                                        addon.name.toLowerCase().includes('montessori') ? 'montessori' :
                                          addon.name.toLowerCase().includes('ecd') ? 'ecdTraining' : null;

                                if (serviceKey) {
                                  updatePreferences({ [serviceKey]: false });
                                }
                              }}
                              className="text-destructive hover:text-destructive p-1 h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            <span className="text-sm text-foreground">+{addon.name}</span>
                          </div>
                          <span className="text-sm font-medium text-secondary">
                            {addon.price === 0 ? 'Free' : `+R${addon.price.toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-foreground">Monthly Total</span>
                      <span className="font-medium text-foreground">
                        R{monthlyPricing.total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payment breakdown */}
                  <div className="bg-primary/5 rounded-lg p-4 mb-4 border border-primary/20">
                    <h3 className="font-semibold text-foreground mb-3">Payment Schedule</h3>

                    <div className="flex justify-between items-center">
                      <span className="text-foreground">Due Today</span>
                      <span className="font-semibold text-secondary text-lg">
                        {placementFee.toLocaleString()} placement fee
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-foreground">Reserved (Month-end)</span>
                      <span className="font-medium text-foreground">
                        R{monthlyPricing.total.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Monthly service fee reserved, charged at month-end
                    </p>
                  </div>

                  {!placementFeeAccepted && (
                    <Button
                      variant="outline"
                      onClick={() => setShowPlacementDialog(true)}
                      className="w-full mb-4 border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      Learn About Placement Fee
                    </Button>
                  )}

                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing || (!placementFeeAccepted && isLongTermBooking)}
                    className="w-full royal-gradient hover:opacity-90 text-white py-4 rounded-xl font-semibold text-lg shadow-lg"
                  >
                    {isProcessing ? <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </> : `Pay ${placementFee.toLocaleString()} placement fee`}
                  </Button>
                </> : <div className="text-center py-8">
                  <div className="space-y-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {isLongTermBooking && (!preferences?.homeSize || !preferences?.livingArrangement)
                        ? 'Loading your profile and preferences...'
                        : isHourlyBooking
                          ? 'Calculating hourly pricing...'
                          : 'Calculating pricing...'}
                    </p>
                    {isLongTermBooking && (!preferences?.homeSize || !preferences?.livingArrangement) && (
                      <p className="text-xs text-amber-600 mt-2">
                        Missing critical preferences. Loading from database...
                      </p>
                    )}
                    {isHourlyBooking && !hourlyPricing && preferences?.bookingSubType && (
                      <p className="text-xs text-red-500 mt-2">
                        Error: Hourly pricing failed to load. Booking type: {preferences?.bookingSubType}
                      </p>
                    )}
                  </div>
                </div>}
        </CardContent>
      </Card>


      <PlacementFeeDialog
        isOpen={showPlacementDialog}
        onOpenChange={(open) => {
          setShowPlacementDialog(open);
          // Stay on payment screen when dialog closes
        }}
        onAccept={() => {
          setPlacementFeeAccepted(true);
          setShowPlacementDialog(false);
          // Stay on payment screen after accepting
        }}
      />
    </div>
  </div>
};
export default PaymentScreen;
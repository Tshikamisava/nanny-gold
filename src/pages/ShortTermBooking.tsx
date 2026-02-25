import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon, GraduationCap, Users, AlertTriangle, Info, Shield, X, ArrowLeft, Sparkles, Heart, Brain, Baby, DollarSign, Gift, CheckCircle, XCircle, ChevronDown, ChevronUp, Star, Zap, Lock, CalendarCheck, TrendingUp, Smile, Home, Repeat, Ban } from "lucide-react";
import { useBooking } from "@/contexts/BookingContext";
import { addDays, format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { isSchoolHolidaySupportAvailable } from "@/utils/schoolHolidays";
import { calculateHourlyPricing, calculateDailyPricing, formatCurrency, isHourlyBasedBooking, isDailyBasedBooking } from "@/utils/pricingUtils";
import { openBespokeEmail } from "@/utils/bespokeEmailHelper";
// PHASE 4: Remove 'short_term' from BookingType - it's a duration type, not a sub-type
type BookingType = 'date_night' | 'date_day' | 'emergency' | 'temporary_support' | 'school_holiday';
const ShortTermBooking = () => {
  const navigate = useNavigate();
  const {
    preferences,
    updatePreferences
  } = useBooking();
  const [bookingType, setBookingType] = useState<BookingType | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<{
    start: string;
    end: string;
  }[]>([]);
  const [calculatedTime, setCalculatedTime] = useState<any>(null);
  const [canBookEmergency, setCanBookEmergency] = useState(true);
  const [schoolHolidayAvailability, setSchoolHolidayAvailability] = useState<any>(null);
  const [hourlyPricing, setHourlyPricing] = useState<any>(null);
  const [dailyPricing, setDailyPricing] = useState<any>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [gapCoverageType, setGapCoverageType] = useState<'normal' | 'promotional' | 'busy_months' | null>(null);
  const [isPromotional, setIsPromotional] = useState(false);
  const [showPaymentTerms, setShowPaymentTerms] = useState(false);

  // Check school holiday availability on mount
  useEffect(() => {
    const availability = isSchoolHolidaySupportAvailable();
    setSchoolHolidayAvailability(availability);
    if (availability.available && availability.currentPeriod) {
      console.log('🏫 Currently in school holiday period:', availability.currentPeriod.name);
    } else if (!availability.available && availability.nextPeriod) {
      console.log('📅 Next school holiday period:', availability.nextPeriod.name, 'starts', availability.nextPeriod.start);
    }
  }, []);

  // Get client's timezone and calculate booking times
  useEffect(() => {
    const calculateBookingTime = async () => {
      try {
        const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const {
          data,
          error
        } = await supabase.functions.invoke('calculate-booking-time', {
          body: {
            clientTimezone,
            bookingType: bookingType || 'date_night'
          }
        });
        if (error) throw error;
        if (data?.success) {
          setCalculatedTime(data.data);
          setCanBookEmergency(data.data.canBookEmergency);

          // Pre-populate time slots for date night bookings with 5PM minimum
          if (bookingType === 'date_night' && timeSlots.length === 0) {
            const startTime = data.data.startTimeFormatted < '17:00' ? '17:00' : data.data.startTimeFormatted;
            setTimeSlots([{
              start: startTime,
              end: data.data.endTimeFormatted
            }]);
          }
        }
      } catch (error) {
        console.error('Error calculating booking time:', error);
      }
    };
    calculateBookingTime();
  }, [bookingType]);

  // Update time slots when booking type changes to date_night or school_holiday
  useEffect(() => {
    if (bookingType === 'date_night' && calculatedTime && timeSlots.length === 0) {
      const startTime = calculatedTime.startTimeFormatted < '17:00' ? '17:00' : calculatedTime.startTimeFormatted;
      setTimeSlots([{
        start: startTime,
        end: calculatedTime.endTimeFormatted
      }]);
    } else if (bookingType === 'date_day' && timeSlots.length === 0) {
      // Default schedule for date day: 8am to 4pm
      setTimeSlots([{
        start: "08:00",
        end: "16:00"
      }]);
    }
  }, [bookingType, calculatedTime]);

  // Calculate live pricing based on booking type, dates, and time slots
  useEffect(() => {
    const calculatePricing = async () => {
      console.log('🔄 Pricing calculation triggered', {
        bookingType,
        selectedDatesCount: selectedDates.length,
        timeSlotsCount: timeSlots.length
      });
      if (!bookingType) {
        console.log('❌ No booking type selected');
        setHourlyPricing(null);
        setDailyPricing(null);
        return;
      }

      // For hourly bookings, require BOTH dates AND time slots
      if (isHourlyBasedBooking(bookingType) && (selectedDates.length === 0 || timeSlots.length === 0)) {
        console.log('⚠️ Hourly booking requires both dates and time slots', {
          hasSelectedDates: selectedDates.length > 0,
          hasTimeSlots: timeSlots.length > 0
        });
        setHourlyPricing(null);
        setDailyPricing(null);
        return;
      }
      setIsCalculatingPrice(true);
      try {
        if (isHourlyBasedBooking(bookingType) && timeSlots.length > 0) {
          console.log('📊 Calculating hourly pricing...', {
            selectedDatesCount: selectedDates.length,
            timeSlots
          });

          // Calculate total hours across all days and time slots
          const totalHours = selectedDates.length * timeSlots.reduce((dayTotal, slot) => {
            const [startHour, startMin] = slot.start.split(':').map(Number);
            const [endHour, endMin] = slot.end.split(':').map(Number);
            let slotHours = endHour + endMin / 60 - (startHour + startMin / 60);

            // Handle overnight slots (e.g., 22:00 to 07:00 = 9 hours, not -15 hours)
            if (slotHours < 0) {
              slotHours += 24;
            }
            return dayTotal + slotHours;
          }, 0);
          console.log('⏰ Total hours calculated:', totalHours);
          // Map services using short-term handler pattern
          const lightHousekeeping = preferences.householdSupport?.includes('light-housekeeping') || false;

          const pricing = await calculateHourlyPricing(
            bookingType as 'emergency' | 'date_night' | 'date_day',
            totalHours,
            {
              cooking: preferences.cooking,
              specialNeeds: preferences.specialNeeds,
              drivingSupport: preferences.drivingSupport,
              lightHousekeeping // Add light housekeeping flag
            },
            selectedDates.map(date => date.toISOString().split('T')[0]),
            // Only pass homeSize if light housekeeping is selected
            lightHousekeeping ? preferences.homeSize : undefined
          );
          console.log('💰 Hourly pricing result:', pricing);
          setHourlyPricing(pricing);
          setDailyPricing(null);

          // Log day-of-week info for date_day bookings
          if (bookingType === 'date_day' && selectedDates.length === 1) {
            const date = selectedDates[0];
            const sastOffset = 2 * 60;
            const sastDate = new Date(date.getTime() + sastOffset * 60 * 1000);
            const dayOfWeek = sastDate.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
            const dayName = sastDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
            console.log('📅 Date_day booking:', { dayName, isWeekend, rate: isWeekend ? 'R55/hr' : 'R40/hr' });
          }
        } else if (isDailyBasedBooking(bookingType) && selectedDates.length > 0 && (bookingType !== 'temporary_support' || gapCoverageType)) {
          console.log('📊 Calculating daily pricing...', {
            selectedDates: selectedDates.length,
            gapCoverageType,
            isPromotional
          });
          // Extract light housekeeping from householdSupport array
          const lightHousekeeping = preferences.householdSupport?.includes('light-housekeeping') || false;

          const pricing = calculateDailyPricing(
            selectedDates.map(date => date.toISOString().split('T')[0]),
            bookingType,
            preferences.homeSize, // Add home size for light housekeeping calculation
            {
              cooking: preferences.cooking || false,
              lightHousekeeping,
              specialNeeds: preferences.specialNeeds || false,
              drivingSupport: preferences.drivingSupport || false
            },
            gapCoverageType || 'normal',
            isPromotional
          );
          console.log('💰 Daily pricing result:', pricing);
          setDailyPricing(pricing);
          setHourlyPricing(null);
        } else {
          console.log('⚠️ No pricing calculation - missing requirements', {
            isHourly: isHourlyBasedBooking(bookingType),
            isDaily: isDailyBasedBooking(bookingType),
            hasTimeSlots: timeSlots.length > 0,
            hasSelectedDates: selectedDates.length > 0
          });
        }
      } catch (error) {
        console.error('❌ Error calculating pricing:', error);
      } finally {
        setIsCalculatingPrice(false);
      }
    };
    calculatePricing();
  }, [bookingType, selectedDates, timeSlots, preferences.cooking, preferences.specialNeeds, preferences.drivingSupport, gapCoverageType, isPromotional, preferences.homeSize, preferences.householdSupport]);
  const handleBookingTypeSelect = (type: BookingType) => {
    // For Gap Coverage, show sub-options instead of directly selecting
    if (type === 'temporary_support') {
      setBookingType(type);
      setGapCoverageType(null); // Reset to show options
      return;
    }
    
    setBookingType(type);
    setGapCoverageType(null);

    // FORCE time slot creation for all short-term booking types
    if (type === 'date_night') {
      // Ensure date night has time slots starting from 5PM
      setTimeSlots([{
        start: '17:00',
        end: '21:00'
      }]);
    } else if (type === 'date_day') {
      // Ensure day bookings have 8-hour default schedule
      setTimeSlots([{
        start: '08:00',
        end: '16:00'
      }]);
    } else if (type === 'emergency') {
      // Emergency will handle time slots in ScheduleBuilder
      setTimeSlots([]);
    }
    console.log('🔄 Setting booking preferences:', {
      durationType: 'short_term',
      bookingSubType: type
    });
    updatePreferences({
      durationType: 'short_term',
      bookingSubType: type
    });
  };

  const handleGapCoverageTypeSelect = (type: 'normal' | 'promotional' | 'busy_months') => {
    setGapCoverageType(type);
    setIsPromotional(type === 'promotional');
    
    // Check if busy months are actually available
    if (type === 'busy_months') {
      const now = new Date();
      const month = now.getMonth(); // 0-11
      const isBusyMonth = month === 11 || month === 0 || month === 5 || month === 6; // Dec, Jan, June, July
      
      if (!isBusyMonth) {
        alert('Busy month pricing is only available during December/January and June/July');
        setGapCoverageType(null);
        return;
      }
    }
    
    updatePreferences({
      durationType: 'short_term',
      bookingSubType: 'temporary_support',
      gapCoverageType: type,
      isPromotional: type === 'promotional'
    });
  };
  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      // Special validation for temporary support (Gap Coverage)
      if (bookingType === 'temporary_support') {
        // Allow any date selection - just need minimum 10 days total
        // No need to validate consecutive days or exclude weekends
        setSelectedDates(dates);
        return;
      }

      // PHASE 5: Validate maximum 1 month for short-term bookings
      if (dates.length > 0 && (bookingType === 'date_day' || bookingType === 'date_night' || bookingType === 'emergency' || bookingType === 'temporary_support')) {
        const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
        const daysDifference = differenceInDays(sortedDates[sortedDates.length - 1], sortedDates[0]);
        if (daysDifference > 30) {
          alert("Short-term bookings are limited to a maximum of 30 days");
          return;
        }
      }
      setSelectedDates(dates);
    }
  };
  const addTimeSlot = () => {
    let defaultStart, defaultEnd;
    if (bookingType === 'date_day') {
      defaultStart = "08:00";
      defaultEnd = "16:00";
    } else if (bookingType === 'date_night') {
      // Ensure Date Night starts at 5PM minimum
      const calculatedStart = calculatedTime?.startTimeFormatted || "17:00";
      defaultStart = calculatedStart < '17:00' ? '17:00' : calculatedStart;
      defaultEnd = calculatedTime?.endTimeFormatted || "23:00";
    } else {
      defaultStart = calculatedTime?.startTimeFormatted || "18:00";
      defaultEnd = calculatedTime?.endTimeFormatted || "23:00";
    }
    setTimeSlots([...timeSlots, {
      start: defaultStart,
      end: defaultEnd
    }]);
  };
  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };
  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    // Validate Date Night start time to be 17:00 or later
    if (bookingType === 'date_night' && field === 'start' && value < '17:00') {
      alert('Date Night support is only available from 5:00 PM onwards');
      return;
    }
    const newSlots = [...timeSlots];
    newSlots[index][field] = value;
    setTimeSlots(newSlots);
  };
  const handleContinue = () => {
    // Special handling for emergency bookings
    if (bookingType === 'emergency') {
      // Emergency bookings use current date and skip date selection
      const today = new Date();
      updatePreferences({
        selectedDates: [today.toISOString()],
        timeSlots: [{
          start: 'ASAP',
          end: 'TBD'
        }],
        bookingSubType: bookingType
      });

      // Call emergency booking function instead of regular flow
      handleEmergencyBooking();
      return;
    }

    // Special handling for temporary support (Gap Coverage)
    if (bookingType === 'temporary_support') {
      if (!gapCoverageType) {
        alert("Please select a Gap Coverage option first");
        return;
      }
      
      if (selectedDates.length < 10) {
        alert("Gap Coverage requires a minimum of 10 days");
        return;
      }

      // Validate minimum 10 days (any days, including weekends)
      if (!validateGapCoverageDays(selectedDates)) {
        alert("Gap Coverage requires a minimum of 10 days. You can select any days including weekends.");
        return;
      }

      // Update preferences for temporary support (no time slots needed)
      updatePreferences({
        selectedDates: selectedDates.map(date => date.toISOString()),
        timeSlots: [],
        // No time slots for daily rate booking
        bookingSubType: bookingType,
        durationType: 'short_term',
        gapCoverageType: gapCoverageType,
        isPromotional: isPromotional
      });
      navigate('/nanny-preferences');
      return;
    }
    if (!bookingType || selectedDates.length === 0) {
      alert("Please select a booking type and dates");
      return;
    }

    // CRITICAL: Auto-fix missing time slots before validation
    if ((bookingType === 'date_night' || bookingType === 'date_day') && timeSlots.length === 0) {
      console.warn(`Auto-fixing missing time slots for ${bookingType}`);
      let autoTimeSlots = [];
      if (bookingType === 'date_night') {
        autoTimeSlots = [{
          start: '17:00',
          end: '21:00'
        }];
      } else {
        autoTimeSlots = [{
          start: '08:00',
          end: '16:00'
        }];
      }
      setTimeSlots(autoTimeSlots);

      // Update preferences with auto-generated time slots
      updatePreferences({
        selectedDates: selectedDates.map(date => date.toISOString()),
        timeSlots: autoTimeSlots,
        bookingSubType: bookingType
      });
    } else {
      // Normal flow with existing time slots
      updatePreferences({
        selectedDates: selectedDates.map(date => date.toISOString()),
        timeSlots: timeSlots,
        bookingSubType: bookingType
      });
    }
    navigate('/nanny-preferences');
  };
  const handleEmergencyBooking = () => {
    // Set emergency booking with time constraints
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Enforce minimum 5 hours duration for business viability
    const fiveHoursLater = new Date(twoHoursLater.getTime() + 5 * 60 * 60 * 1000);
    updatePreferences({
      selectedDates: [now.toISOString()],
      timeSlots: [{
        start: twoHoursLater.toTimeString().slice(0, 5),
        end: fiveHoursLater.toTimeString().slice(0, 5)
      }],
      bookingSubType: 'emergency',
      durationType: 'short_term'
    });

    // Navigate to schedule builder for emergency booking setup
    navigate('/schedule-builder');
  };
  // Helper function to validate minimum days for Gap Coverage
  const validateGapCoverageDays = (selectedDates: Date[]): boolean => {
    // Gap Coverage requires minimum 10 days (any days, including weekends)
    return selectedDates.length >= 10;
  };
  const isDateDisabled = (date: Date) => {
    // Disable past dates
    return date < new Date();
  };
  return <div className="min-h-screen bg-background flex flex-col">
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* NannyGold Branding */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-script leading-tight mb-2">
          <span className="text-primary">Nanny</span>
          <span className="gold-shimmer">Gold</span>
        </h1>
        <p className="text-muted-foreground text-lg">Short-Term Support Options</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {!bookingType && <>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">What type of support do you need?</h2>
            <p className="text-muted-foreground">
              Choose the option that best fits your needs
            </p>
          </div>

          <div className="space-y-4">
            {/* Emergency Booking - Top Priority */}
            <Card className="p-6 rounded-2xl border-red-300 bg-red-50 cursor-pointer hover:shadow-lg transition-all hover:border-red-400" onClick={() => handleBookingTypeSelect('emergency')}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-300">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-red-800 mb-2">
                  Emergency Support
                </h3>
                <p className="text-red-700 font-medium">Need help TODAY? Nanny arrives within 2 hours</p>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl border-primary/20 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40" onClick={() => handleBookingTypeSelect('date_night')}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Date Night
                </h3>
                <p className="text-muted-foreground">Evening support for special occasions</p>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl border-primary/20 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40" onClick={() => handleBookingTypeSelect('date_day')}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Daytime</h3>
                <p className="text-muted-foreground">Daytime help any day, any reason</p>
              </div>
            </Card>

            <Card className="p-4 rounded-xl border-primary/20 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40" onClick={() => handleBookingTypeSelect('temporary_support')}>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Gap Coverage</h3>
                <p className="text-muted-foreground text-sm">Support during transitions, up to 1 month</p>
              </div>
            </Card>
          </div>
        </>}

        {/* Gap Coverage Type Selection - Redesigned UI */}
        {bookingType === 'temporary_support' && !gapCoverageType && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setBookingType(null);
                setGapCoverageType(null);
              }}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
                Gap Cover 2026
              </h1>
              <h2 className="text-lg md:text-xl font-medium text-muted-foreground mb-2">
                Stress-free childcare when your routine changes
              </h2>
              <p className="text-sm text-muted-foreground/80 font-light">
                For holidays, travel, transition season cover
              </p>
            </div>

            {/* Future-You Gap Cover (Hero Card) */}
            <Card className="p-6 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/5 via-primary/3 to-background cursor-pointer hover:shadow-xl transition-all hover:border-primary/20 relative overflow-hidden group" onClick={() => handleGapCoverageTypeSelect('promotional')}>
              {/* Limited Period Badge */}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-secondary" strokeWidth={2.5} />
              </div>
              
              <div className="flex items-start gap-5">
                {/* Icon on Left */}
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/10">
                  <CalendarCheck className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                
                {/* Content on Right */}
                <div className="flex-1 pt-1">
                  <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    Future-You Gap Cover
                  </h3>
                  <p className="text-base font-medium text-muted-foreground mb-3">
                    Plan now. Stay calm later.
                  </p>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed mb-6">
                    Secure trusted care for December–January, pay over time, avoid the holiday scramble.
                  </p>
                  
                  <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all w-full">
                    Secure December Care
                  </Button>

                  {/* Flexible Payment Terms - Collapsible */}
                  <Collapsible open={showPaymentTerms} onOpenChange={setShowPaymentTerms} className="mt-4">
                    <CollapsibleTrigger 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPaymentTerms(!showPaymentTerms);
                      }}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-2 transition-colors w-full justify-start"
                    >
                      <span className="font-medium">Flexible Payment Terms</span>
                      {showPaymentTerms ? <ChevronUp className="w-4 h-4" strokeWidth={2} /> : <ChevronDown className="w-4 h-4" strokeWidth={2} />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 text-sm text-muted-foreground space-y-2.5 bg-white/40 rounded-xl p-4 backdrop-blur-sm">
                      <p><span className="font-medium">Placement fee:</span> split over 2 months</p>
                      <p><span className="font-medium">Service fee:</span> 50% paid before booking</p>
                      <p><span className="font-medium">Balance:</span> paid on last day of care</p>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </Card>

            {/* Life-as-usual Gap Cover (Card 1) */}
            <Card className="p-6 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/3 via-primary/2 to-background cursor-pointer hover:shadow-xl transition-all hover:border-primary/20 group" onClick={() => handleGapCoverageTypeSelect('normal')}>
              <div className="flex items-start gap-5">
                {/* Icon on Left */}
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                  <Home className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                
                {/* Content on Right */}
                <div className="flex-1 pt-1">
                  <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    Life-as-usual Gap Cover
                  </h3>
                  <p className="text-base font-medium text-muted-foreground mb-4">
                    Reliable care for regular periods
                  </p>
                  <Button variant="ghost" className="text-primary hover:text-primary/80 p-0 h-auto font-medium text-sm">
                    See what's included →
                  </Button>
                </div>
              </div>
            </Card>

            {/* Holiday Season Gap Cover (Card 2) */}
            {(() => {
              const now = new Date();
              const month = now.getMonth();
              const isBusyMonth = month === 11 || month === 0 || month === 5 || month === 6;
              const currentBusyPeriod = month === 11 || month === 0 ? 'Dec–Jan' : month === 5 || month === 6 ? 'Jun–Jul' : null;
              
              return (
                <Card 
                  className={`p-6 rounded-3xl border cursor-pointer transition-all group ${
                    isBusyMonth 
                      ? 'border-secondary/20 bg-gradient-to-br from-secondary/5 via-secondary/3 to-background hover:shadow-xl hover:border-secondary/30' 
                      : 'border-gray-200 bg-gray-50/50 opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => isBusyMonth && handleGapCoverageTypeSelect('busy_months')}
                >
                  <div className="flex items-start gap-5">
                    {/* Icon on Left */}
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center border ${
                      isBusyMonth 
                        ? 'bg-secondary/10 border-secondary/20' 
                        : 'bg-gray-100 border-gray-200'
                    }`}>
                      <Shield className={`w-8 h-8 ${isBusyMonth ? 'text-secondary' : 'text-gray-400'}`} strokeWidth={1.5} />
                    </div>
                    
                    {/* Content on Right */}
                    <div className="flex-1 pt-1">
                      <h3 className={`text-2xl font-bold mb-2 tracking-tight ${isBusyMonth ? 'text-foreground' : 'text-gray-500'}`}>
                        Holiday Season Gap Cover
                      </h3>
                      <p className={`text-base font-medium mb-3 ${isBusyMonth ? 'text-muted-foreground' : 'text-gray-400'}`}>
                        Protection during high-demand holidays
                      </p>
                      
                      {/* Availability Pill */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
                        isBusyMonth 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <CalendarIcon className="w-3 h-3" strokeWidth={2} />
                        <span>{isBusyMonth ? currentBusyPeriod : 'Dec–Jan · Jun–Jul'}</span>
                      </div>
                      
                      {!isBusyMonth && (
                        <p className="text-xs text-gray-400 mb-4 font-light">
                          Not available outside busy months
                        </p>
                      )}
                      
                      <div className={`space-y-2 mb-4 ${isBusyMonth ? 'text-muted-foreground' : 'text-gray-400'}`}>
                        <p className="text-sm">• Priority matching included</p>
                        <p className="text-sm">• Seasonal surcharge applies</p>
                        <p className="text-sm">• Limited availability</p>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className={`w-full rounded-2xl border-2 ${
                          isBusyMonth 
                            ? 'border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10' 
                            : 'border-gray-200 text-gray-400'
                        }`}
                        disabled={!isBusyMonth}
                      >
                        View Peak Pricing
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Why Gap Cover Exists - Expandable Section */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="why-gap-cover" className="border border-primary/10 rounded-2xl px-5 bg-white/60 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold text-lg py-5 hover:no-underline">
                  Why Gap Cover Exists
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2 pb-4">
                    <h4 className="font-semibold text-foreground mb-4 text-base">Why Parents Love our Future-You Gap Cover</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                        <Ban className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <p className="text-foreground leading-relaxed">No emotional labour while you're still working</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                        <Home className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <p className="text-foreground leading-relaxed">No strangers in your home</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                        <Repeat className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <p className="text-foreground leading-relaxed">No re-explaining routines</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                        <XCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <p className="text-foreground leading-relaxed">No cancelled plans because of childcare</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* What You Get - Expandable Section with Grouped Benefits */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-you-get" className="border border-primary/10 rounded-2xl px-5 bg-white/60 backdrop-blur-sm">
                <AccordionTrigger className="text-left font-semibold text-lg py-5 hover:no-underline">
                  What You Get
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5 pt-2 pb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-5">Included With Every Gap Cover</p>
                    
                    {/* Peace of Mind Group */}
                    <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/2 border border-primary/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/10">
                          <Brain className="w-5 h-5 text-primary" strokeWidth={1.5} />
                        </div>
                        <h5 className="font-semibold text-foreground text-base">Peace of Mind</h5>
                      </div>
                      <div className="pl-13 space-y-2.5 text-sm">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">Familiar, briefed caregivers</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">No-cost replacements</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">Backup coverage if plans change</p>
                        </div>
                      </div>
                    </div>

                    {/* Child-Centred Care Group */}
                    <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/2 border border-primary/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/10">
                          <Baby className="w-5 h-5 text-primary" strokeWidth={1.5} />
                        </div>
                        <h5 className="font-semibold text-foreground text-base">Child-Centred Care</h5>
                      </div>
                      <div className="pl-13 space-y-2.5 text-sm">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">Continuity & emotional safety</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">Routine-aligned support</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">Care matched to your preferences</p>
                        </div>
                      </div>
                    </div>

                    {/* Financial Ease Group */}
                    <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-secondary/5 to-secondary/2 border border-secondary/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center border border-secondary/10">
                          <DollarSign className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                        </div>
                        <h5 className="font-semibold text-foreground text-base">Financial Ease</h5>
                      </div>
                      <div className="pl-13 space-y-2.5 text-sm">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">Smaller, planned payments over time</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground">No peak panic pricing</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" strokeWidth={2} />
                          <p className="text-foreground leading-relaxed">R200 credit for your next booking when you refer a friend or fam (t's and c's apply: friend must take up the long term of Gap Cover service until their booking is completed)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Date Selection - Only for non-emergency bookings and after Gap Coverage type is selected */}
        {bookingType && bookingType !== 'emergency' && (bookingType !== 'temporary_support' || gapCoverageType) && (
          <div className="space-y-6">
            {/* Live Pricing Display */}
            {(hourlyPricing || dailyPricing) && <Card className="p-4 rounded-xl border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  💰 Live Pricing
                  {isCalculatingPrice && <span className="text-sm text-muted-foreground">(calculating...)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hourlyPricing && <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Base Rate:</span>
                    <span>{formatCurrency(hourlyPricing.baseRate)}</span>
                  </div>
                  {hourlyPricing.services.length > 0 && <div className="flex justify-between">
                    <span>Additional Services:</span>
                    <span>{formatCurrency(hourlyPricing.servicesTotal)}</span>
                  </div>}
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(hourlyPricing.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee (15%):</span>
                    <span>{formatCurrency(hourlyPricing.serviceFee)}</span>
                  </div>
                  {hourlyPricing.emergencySurcharge > 0 && <div className="flex justify-between text-red-600">
                    <span>Emergency Surcharge:</span>
                    <span>{formatCurrency(hourlyPricing.emergencySurcharge)}</span>
                  </div>}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(hourlyPricing.total)}</span>
                  </div>
                </div>}
                {dailyPricing && <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Daily Rate:</span>
                    <span>{formatCurrency(dailyPricing.dailyRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Number of Days:</span>
                    <span>{dailyPricing.numberOfDays}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(dailyPricing.total)}</span>
                  </div>
                </div>}
              </CardContent>
            </Card>}

            {/* Bespoke Arrangements Section */}
            <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-muted">
              <div className="text-center mb-3">
                <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Need Something Different?</h3>
                <p className="text-muted-foreground text-xs">
                  Can't find the right support option? We offer bespoke arrangements tailored to your unique needs.
                </p>
              </div>

              <Button variant="outline" onClick={() => openBespokeEmail({ bookingType: 'short_term' })} className="w-full border-primary/30 text-primary hover:bg-primary/5 rounded-xl py-2 text-sm">
                Email Us for Custom Arrangements
              </Button>
            </div>
          </div>
        )}

        {/* Date Selection - Only for non-emergency bookings */}
        {bookingType && bookingType !== 'emergency' && (bookingType !== 'temporary_support' || gapCoverageType) && <div className="space-y-6">
          <Card className="rounded-2xl border-primary/20">
            <CardHeader className="bg-primary/5 rounded-t-2xl border-b border-primary/10">
              <CardTitle className="text-primary text-center">
                Select Your {bookingType === 'date_night' ? 'Date Night' : bookingType === 'date_day' ? 'Day Care' : bookingType === 'temporary_support' ? 'Gap Coverage' : 'Temporary Support'} Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar mode="multiple" selected={selectedDates} onSelect={handleDateSelect} disabled={isDateDisabled} className="w-full" classNames={{
                months: "flex flex-col space-y-4",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center mb-4",
                caption_label: "text-lg font-semibold text-primary",
                nav: "space-x-1 flex items-center",
                nav_button: "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 text-primary",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-primary rounded-md w-10 font-medium text-sm",
                row: "flex w-full mt-2",
                cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day: "h-10 w-10 p-0 font-normal hover:bg-primary/10 rounded-full flex items-center justify-center",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
                day_today: "bg-primary/10 text-primary font-semibold",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50"
              }} />
              {selectedDates.length > 0 && bookingType === 'temporary_support' && (
                <div className="mt-4 space-y-3">
                  {/* Start and End Date Display */}
                  {selectedDates.length > 0 && (() => {
                    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
                    const startDate = sortedDates[0];
                    const endDate = sortedDates[sortedDates.length - 1];
                    return (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Start Date:</span>
                            <div className="font-semibold text-primary">{format(startDate, 'MMM dd, yyyy')}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">End Date:</span>
                            <div className="font-semibold text-primary">{format(endDate, 'MMM dd, yyyy')}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <span className="text-xs text-muted-foreground">
                            {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
                            {selectedDates.length < 10 && (
                              <span className="block mt-1 text-orange-600">
                                (Minimum 10 days required - any days including weekends)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pricing Display */}
                  <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-primary/80">Total Service Fee</span>
                        {selectedDates.length < 10 && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full border border-orange-200">
                            Min 10
                          </span>
                        )}
                      </div>
                      {dailyPricing ? (
                        <div className="space-y-1">
                          <div className="text-xl font-bold text-primary animate-fade-in transition-all duration-300">
                            {formatCurrency(dailyPricing.total)}
                          </div>
                          {dailyPricing.serviceFeePerDay && (
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(dailyPricing.serviceFeePerDay)}/day × {selectedDates.length} days
                            </div>
                          )}
                          {dailyPricing.placementFee && (
                            <div className="text-xs text-primary/70 mt-1">
                              + {formatCurrency(dailyPricing.placementFee)} placement fee (payable first)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Calculating pricing...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots for Date Night and Date Day */}
          {(bookingType === 'date_night' || bookingType === 'date_day') && <Card className="rounded-2xl border-primary/20">
            <CardHeader className="bg-primary/5 rounded-t-2xl border-b border-primary/10">
              <CardTitle className="text-primary text-center">
                {bookingType === 'date_night' ? 'Select your time slots' : 'Select your daily schedule'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {bookingType === 'date_night' && <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <div className="flex items-center text-blue-700">
                  <Clock className="w-4 h-4 mr-2" />
                  <p className="text-sm font-medium">
                    Date Night support is available from 5:00 PM onwards
                  </p>
                </div>
              </div>}

              {timeSlots.map((slot, index) => <div key={index} className="flex items-center space-x-2">
                <input type="time" value={slot.start} onChange={e => updateTimeSlot(index, 'start', e.target.value)} min={bookingType === 'date_night' ? '17:00' : undefined} className={`flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 ${bookingType === 'date_night' ? 'border-primary/20 focus:border-primary' : 'border-primary/20 focus:border-primary'}`} />
                <span className="text-primary">to</span>
                <input type="time" value={slot.end} onChange={e => updateTimeSlot(index, 'end', e.target.value)} className="flex-1 p-2 border border-primary/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20" />
                {timeSlots.length > 1 && <Button variant="outline" size="sm" onClick={() => removeTimeSlot(index)} className="p-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
                  <X className="w-4 h-4" />
                </Button>}
              </div>)}

              <Button variant="outline" onClick={addTimeSlot} className="w-full border-primary/30 text-primary hover:bg-primary/10">
                Add Time Slot
              </Button>

              {/* Live Pricing Display - TEMPORARILY HIDDEN until post-launch fix */}
              {/* {selectedDates.length > 0 && timeSlots.length > 0 && <div className="mt-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                         <div className="text-center">
                           <div className="flex items-center justify-center space-x-2 mb-1">
                             <span className="text-xs font-medium text-primary/80">Live Rate</span>
                             {isCalculatingPrice && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-200">
                                 Calculating...
                               </span>}
                           </div>
                             {hourlyPricing ? <div>
                                 <div className="text-xl font-bold text-primary animate-fade-in transition-all duration-300">
                                   {formatCurrency(hourlyPricing.total)}
                                 </div>
                                 <div className="text-xs text-primary/70 mt-1">
                                   {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} × {timeSlots.reduce((total, slot) => {
                                      const [startHour, startMin] = slot.start.split(':').map(Number);
                                      const [endHour, endMin] = slot.end.split(':').map(Number);
                                      const hours = endHour + endMin / 60 - (startHour + startMin / 60);
                                      return total + hours;
                                    }, 0).toFixed(1)} hrs/day
            </div>
            {hourlyPricing.emergencySurcharge > 0 && <div className="text-xs text-red-600 mt-1">
              Includes emergency surcharge
            </div>}
          </div> : <div className="text-lg font-semibold text-primary/60">
            {selectedDates.length === 0 ? 'Select dates first, then time slots' : 'Add time slots to see pricing'}
          </div>}
        </div>
                       </div>} */ }
            </CardContent>
          </Card>
          }

          {/* Bespoke Arrangements Section */}
          <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-muted">
            <div className="text-center mb-3">
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Need Something Different?</h3>
              <p className="text-muted-foreground text-xs">
                Can't find the right support option? We offer bespoke arrangements tailored to your unique needs.
              </p>
            </div>

            <Button variant="outline" onClick={() => openBespokeEmail({ bookingType })} className="w-full border-primary/30 text-primary hover:bg-primary/5 rounded-xl py-2 text-sm">
              Email Us for Custom Arrangements
            </Button>
          </div>

          <Button onClick={handleContinue} disabled={selectedDates.length === 0 || (bookingType === 'date_night' || bookingType === 'date_day') && timeSlots.length === 0 || (bookingType === 'temporary_support' && !gapCoverageType)} className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-2xl font-semibold disabled:opacity-50">
            Continue
          </Button>

          <Button variant="outline" onClick={() => setBookingType(null)} className="w-full border-primary/20 text-primary hover:bg-primary/10 rounded-2xl">
            Reset Selection
          </Button>
        </div >}

        {/* Emergency Booking Interface */}
        {
          bookingType === 'emergency' && <div className="space-y-6">
            <Card className="rounded-2xl border-red-300 bg-red-50">
              <CardHeader className="bg-red-100 rounded-t-2xl border-b border-red-200">
                <CardTitle className="text-red-800 text-center">Emergency Request</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <div className="mb-6">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                  <h3 className="text-xl font-semibold text-red-800 mb-2">
                    Need Help Today?
                  </h3>
                  <p className="text-red-700 mb-4">
                    We'll connect you with available nannies who can arrive within 2 hours. Minimum 5-hour booking at R80/hour.
                  </p>

                  <div className="bg-white p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600 font-medium">
                      Quick Response: Nannies notified immediately<br />
                      Today Only: Service for immediate needs
                      {calculatedTime && <>
                        <br />Start Time: {calculatedTime.startTimeFormatted}
                      </>}
                    </p>

                    {/* Emergency Pricing Display */}
                    <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-center">
                        <div className="text-xs font-medium text-red-700 mb-1">Emergency Rate</div>
                        <div className="text-lg font-bold text-red-700">
                          R80/hour (min 5 hours = R400)
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          + Emergency surcharge applies
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleContinue} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-semibold text-lg">
              Submit Emergency Request
            </Button>

            <Button variant="outline" onClick={() => setBookingType(null)} className="w-full border-red-300 text-red-600 hover:bg-red-50 rounded-2xl">
              Reset Selection
            </Button>
          </div>
        }
      </div >
    </div >
  </div >;
};
export default ShortTermBooking;
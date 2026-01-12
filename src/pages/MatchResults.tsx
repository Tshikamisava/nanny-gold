
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Star, Heart, Calendar, Loader2, Mail } from "lucide-react";
import { useMatchingNannies } from "@/hooks/useNannies";
import { useBooking } from "@/contexts/BookingContext";
import { calculateHourlyPricing, isHourlyBasedBooking, formatCurrency } from "@/utils/pricingUtils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClientProfile } from "@/hooks/useClientProfile";

// Helper function to count children (18 years and under)
const countChildren = (childrenAges: string[]): number => {
  return childrenAges.filter(age => {
    // Extract numeric value from age string
    const numericAge = parseFloat(age.match(/\d+(\.\d+)?/)?.[0] || '0');
    
    // Check if age is in months or years
    if (age.toLowerCase().includes('month')) {
      return numericAge <= 216; // 18 years = 216 months
    } else if (age.toLowerCase().includes('year')) {
      return numericAge <= 18;
    } else {
      // Assume years if no unit specified
      return numericAge <= 18;
    }
  }).length;
};

const MatchResults = () => {
  const navigate = useNavigate();
  const { preferences, createBooking, setSelectedNanny } = useBooking();
  const { toast } = useToast();
  const { profile: clientProfile } = useClientProfile();
  const [pricingData, setPricingData] = useState<Record<string, any>>({});
  // Per-nanny loading states instead of global
  const [bookingStates, setBookingStates] = useState<Record<string, boolean>>({});
  
  const { data: matchingNannies, isLoading, error, refetch } = useMatchingNannies({
    specialNeeds: preferences.specialNeeds,
    ecdTraining: preferences.ecdTraining,
    drivingSupport: preferences.drivingSupport,
    cooking: preferences.cooking,
    montessori: preferences.montessori,
    location: preferences.location,
    childrenAges: preferences.childrenAges,
    livingArrangement: preferences.livingArrangement
  });
  
  // Force cache refresh on mount to get fresh data with new RLS policies
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  // Debug logging for state tracking with detailed profile data
  console.log('🔍 MatchResults state:', {
    isLoading,
    error: !!error,
    matchingNanniesCount: matchingNannies?.length || 0,
    preferences: preferences.durationType,
    sampleNanny: matchingNannies?.[0] ? {
      id: matchingNannies[0].id,
      hasProfiles: !!matchingNannies[0].profiles,
      firstName: matchingNannies[0].profiles?.first_name,
      lastName: matchingNannies[0].profiles?.last_name,
      avatarUrl: matchingNannies[0].profiles?.avatar_url,
      rating: matchingNannies[0].rating
    } : null
  });

  // Calculate pricing for each nanny when preferences change
  useEffect(() => {
    const calculatePricingForMatches = async () => {
      if (!matchingNannies || !preferences.durationType) return;
      
      console.log('🔍 Calculating pricing for matches...');
      console.log('📋 Current preferences:', {
        durationType: preferences.durationType,
        bookingSubType: preferences.bookingSubType,
        selectedDates: preferences.selectedDates?.length,
        timeSlots: preferences.timeSlots,
        services: {
          cooking: preferences.cooking,
          specialNeeds: preferences.specialNeeds,
          drivingSupport: preferences.drivingSupport
        }
      });
      
      const newPricingData: Record<string, any> = {};
      
      for (const nanny of matchingNannies) {
        if (preferences.durationType === 'short_term' && isHourlyBasedBooking(preferences.bookingSubType)) {
          try {
            // Calculate total hours based on booking type
            let totalHours = 0;
            
            if (preferences.bookingSubType === 'date_night') {
              // Date night: multiply time slot hours by number of dates
              totalHours = preferences.timeSlots && preferences.selectedDates 
                ? preferences.timeSlots.reduce((total: number, slot: any) => {
                    const start = new Date(`2000-01-01T${slot.start}:00`);
                    const end = new Date(`2000-01-01T${slot.end}:00`);
                    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return total + hours;
                  }, 0) * preferences.selectedDates.length
                : 0;
            } else if (preferences.bookingSubType === 'school_holiday' || preferences.bookingSubType === 'date_day') {
              // School holiday/date day: multiply time slot hours by number of days
              if (preferences.timeSlots && preferences.selectedDates) {
                const dailyHours = preferences.timeSlots.reduce((total: number, slot: any) => {
                  const start = new Date(`2000-01-01T${slot.start}:00`);
                  const end = new Date(`2000-01-01T${slot.end}:00`);
                  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  return total + hours;
                }, 0);
                totalHours = dailyHours * preferences.selectedDates.length;
                
                console.log(`🕒 ${preferences.bookingSubType} calculation:`, {
                  timeSlots: preferences.timeSlots,
                  dailyHours,
                  selectedDatesCount: preferences.selectedDates.length,
                  totalHours
                });
              } else {
                // Fallback: 8 hours per selected date
                totalHours = preferences.selectedDates ? preferences.selectedDates.length * 8 : 0;
              }
            } else if (preferences.bookingSubType === 'emergency') {
              // Emergency: multiply time slot hours by number of dates, minimum 5 hours total
              if (preferences.timeSlots && preferences.selectedDates) {
                const slotHours = preferences.timeSlots.reduce((total: number, slot: any) => {
                  const start = new Date(`2000-01-01T${slot.start}:00`);
                  const end = new Date(`2000-01-01T${slot.end}:00`);
                  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  return total + hours;
                }, 0);
                totalHours = Math.max(5, slotHours * preferences.selectedDates.length);
              } else {
                // Fallback: minimum 5 hours
                totalHours = Math.max(5, preferences.selectedDates ? preferences.selectedDates.length * 5 : 5);
              }
            }

            // Map services using short-term handler pattern
            const lightHousekeeping = preferences.householdSupport?.includes('light-housekeeping') || false;
            
            const services = {
              cooking: preferences.cooking || false,
              specialNeeds: preferences.specialNeeds || false,
              drivingSupport: preferences.drivingSupport || false,
              lightHousekeeping
            };

            // Validate minimum 5 hours for emergency bookings
            if (preferences.bookingSubType === 'emergency' && totalHours < 5) {
              console.error(`❌ Emergency booking must be minimum 5 hours. Current: ${totalHours} hours`);
              // Skip this nanny or show error
              newPricingData[nanny.id] = {
                amount: 0,
                label: 'Invalid booking duration',
                isHourly: true,
                error: 'Emergency bookings require minimum 5 hours'
              };
              continue;
            }

            const effectiveHours = totalHours;

            console.log(`💰 Calculating hourly pricing for nanny ${nanny.id}:`, {
              bookingType: preferences.bookingSubType,
              originalHours: totalHours,
              effectiveHours,
              services
            });

            try {
              // Call the edge function with selectedDates for weekend detection and homeSize for light housekeeping
              const { data: pricing, error } = await supabase.functions.invoke('calculate-hourly-pricing', {
                body: {
                  bookingType: preferences.bookingSubType,
                  totalHours: effectiveHours,
                  services,
                  selectedDates: preferences.selectedDates,
                  homeSize: lightHousekeeping ? preferences.homeSize : undefined
                }
              });
              
              if (error) {
                throw error;
              }
              
              console.log(`✅ Hourly pricing result for nanny ${nanny.id}:`, {
                baseHourlyRate: pricing.baseHourlyRate,
                effectiveHourlyRate: pricing.effectiveHourlyRate,
                subtotal: pricing.subtotal,
                total: pricing.total,
                services: pricing.services
              });
              
              newPricingData[nanny.id] = {
                amount: pricing.total,
                label: '/total',
                isHourly: true,
                details: pricing
              };
            } catch (error) {
              console.error('❌ Error calculating hourly pricing for nanny:', nanny.id, error);
              
              // Client-side fallback calculation for reliable emergency pricing
              const baseRate = preferences.bookingSubType === 'emergency' ? 80 : 40;
              const serviceRate = (services.cooking ? 15 : 0) + (services.specialNeeds ? 25 : 0);
              const hourlyRate = baseRate + serviceRate;
              const total = hourlyRate * effectiveHours;
              
              console.log(`🔄 Using client-side fallback pricing for nanny ${nanny.id}:`, {
                baseRate,
                serviceRate,
                hourlyRate,
                effectiveHours,
                total
              });
              
              newPricingData[nanny.id] = {
                amount: total,
                label: '/total',
                isHourly: true,
                details: {
                  baseHourlyRate: baseRate,
                  effectiveHourlyRate: hourlyRate,
                  total: total,
                  services: []
                }
              };
            }
          } catch (outerError) {
            console.error('❌ Outer error for nanny:', nanny.id, outerError);
            // For short-term hourly bookings, don't show monthly rate as fallback
            // Instead show loading state until proper calculation is available
            newPricingData[nanny.id] = {
              amount: 0,
              label: 'Calculating...',
              isHourly: true,
              loading: true
            };
          }
        } else {
          // Long-term or non-hourly bookings
          console.log(`📅 Using monthly rate for nanny ${nanny.id}:`, nanny.monthly_rate || 4500);
          newPricingData[nanny.id] = {
            amount: nanny.monthly_rate || 4500,
            label: '/month',
            isHourly: false
          };
        }
      }
      
      console.log('📊 Final pricing data for all nannies:', newPricingData);
      setPricingData(newPricingData);
    };

    calculatePricingForMatches();
  }, [matchingNannies, preferences]);

  const getNannyImage = (nanny: any) => {
    // Use nanny's profile photo if available, otherwise use placeholder
    const imageUrl = nanny.profiles?.avatar_url || "/placeholder.svg";
    console.log(`🖼️ Image for nanny ${nanny.id}:`, imageUrl);
    return imageUrl;
  };

  const handleBookNanny = async (nannyId: string) => {
    // ✅ P4: Prevent duplicate bookings - check if already processing
    if (bookingStates[nannyId]) {
      console.log('⚠️ Booking already in progress for nanny:', nannyId);
      return;
    }

    // ✅ P4: Set loading state for THIS nanny only (prevents double-clicks)
    setBookingStates(prev => ({ ...prev, [nannyId]: true }));
    
    try {
      // Phase 5: Add validation before booking
      if (preferences.durationType === 'short_term') {
        if (!preferences.bookingSubType) {
          throw new Error('Please select a booking type first');
        }
        if (!preferences.selectedDates?.length) {
          throw new Error('Please select dates for your booking');
        }
        if (!preferences.timeSlots?.length) {
          throw new Error('Please select time slots for your booking');
        }
      }

      // Find and store the selected nanny
      const selectedNanny = matchingNannies?.find(nanny => nanny.id === nannyId);
      if (selectedNanny) {
        setSelectedNanny(selectedNanny);
        
        // Store selected nanny in localStorage for dashboard access
        const bookingData = {
          selectedNanny: selectedNanny,
          timestamp: Date.now()
        };
        localStorage.setItem('currentBooking', JSON.stringify(bookingData));
        console.log('Stored selected nanny in localStorage:', selectedNanny.profiles?.first_name, selectedNanny.profiles?.last_name);
      }
      
      await createBooking(nannyId);
      navigate('/payment');
    } catch (error: any) {
      console.error('Booking error:', error);
      
      // Phase 5: Show user-friendly error message
      toast({
        title: "Booking Error",
        description: error.message || "Unable to create booking. Please try again.",
        variant: "destructive"
      });
      
      setBookingStates(prev => ({ ...prev, [nannyId]: false }));
    }
  };

  const handleScheduleInterview = (nanny: any) => {
    const params = new URLSearchParams({
      nannyId: nanny.id,
      nannyName: `${nanny.profiles?.first_name} ${nanny.profiles?.last_name}`,
      nannyEmail: nanny.profiles?.email || ''
    });
    navigate(`/interview-scheduling?${params.toString()}`);
  };


  const getRequiredServices = () => {
    const services = [];
    if (preferences.cooking) services.push("Cooking");
    if (preferences.specialNeeds) services.push("Diverse Ability Support");
    if (preferences.drivingSupport) services.push("Driving Support");
    return services;
  };

  const getNannyBadges = (nanny: any) => {
    const badges = [];
    const services = nanny.nanny_services;
    
    // Add null checks for services
    if (services?.pet_care) badges.push("Pet Care");
    if (services?.cooking) badges.push("Food Prep");
    if (nanny.certifications?.includes("First Aid")) badges.push("First Aid");
    
    // If no badges, add default skills from the skills array
    if (badges.length === 0 && nanny.skills?.length > 0) {
      nanny.skills.slice(0, 3).forEach((skill: string) => {
        badges.push(skill);
      });
    }
    
    console.log(`🏷️ Badges for nanny ${nanny.id}:`, badges);
    return badges;
  };

  const getNannyPricing = (nanny: any) => {
    const pricing = pricingData[nanny.id];
    if (!pricing) {
      // Show loading state while pricing is being calculated
      return {
        amount: 0,
        label: 'Calculating...',
        formatted: 'Calculating...',
        loading: true
      };
    }
    
    if (pricing.loading) {
      return {
        amount: 0,
        label: 'Calculating...',
        formatted: 'Calculating...',
        loading: true
      };
    }
    
    return {
      amount: pricing.amount,
      label: pricing.label,
      formatted: formatCurrency(pricing.amount),
      loading: false
    };
  };

  const getFamilyInfo = () => {
    const info = [];
    const numberOfChildren = preferences.childrenAges ? countChildren(preferences.childrenAges) : 0;
    if (numberOfChildren > 0) {
      info.push(`${numberOfChildren} ${numberOfChildren === 1 ? 'child' : 'children'}`);
    }
    if (preferences.childrenAges && preferences.childrenAges.length > 0) {
      const ages = preferences.childrenAges.filter(age => age.trim() !== '');
      if (ages.length > 0) {
        info.push(`Ages: ${ages.join(', ')}`);
      }
    }
    return info;
  };

  const handleContactSupport = () => {
    // Get client profile information
    const firstName = clientProfile?.firstName || 'Client';
    const lastName = clientProfile?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Client';
    const email = clientProfile?.email || '';
    const phone = clientProfile?.phone || '';
    const location = clientProfile?.location || preferences.location || 'Not specified';
    
    // Get children information
    const numberOfChildren = preferences.childrenAges ? countChildren(preferences.childrenAges) : 0;
    const childrenAges = preferences.childrenAges?.filter(age => age.trim() !== '').join(', ') || 'Not specified';
    
    // Get preferences
    const livingArrangement = preferences.livingArrangement || 'Not specified';
    const durationType = preferences.durationType === 'long_term' ? 'Long-term' : 'Short-term';
    const bookingSubType = preferences.bookingSubType || 'Not specified';
    
    // Get required services
    const services = [];
    if (preferences.cooking) services.push('Cooking');
    if (preferences.specialNeeds) services.push('Diverse Ability Support');
    if (preferences.drivingSupport) services.push('Driving Support');
    if (preferences.ecdTraining) services.push('ECD Training');
    if (preferences.montessori) services.push('Montessori');
    const servicesList = services.length > 0 ? services.join(', ') : 'None specified';
    
    // Build email subject
    const subject = encodeURIComponent('No Perfect Matches Found - Assistance Requested');
    
    // Build email body with all client details
    const body = encodeURIComponent(`Hi NannyGold Support Team,

I couldn't find perfect matches for my family's requirements. Could you please help me find a suitable nanny?

MY PROFILE DETAILS:
- Name: ${fullName}
- Email: ${email}
- Phone: ${phone}
- Location: ${location}

FAMILY INFORMATION:
- Number of Children: ${numberOfChildren}
- Children's Ages: ${childrenAges}

BOOKING REQUIREMENTS:
- Booking Type: ${durationType}
- Booking Sub-Type: ${bookingSubType}
- Living Arrangement: ${livingArrangement}

REQUIRED SERVICES:
${servicesList}

ADDITIONAL NOTES:
I've searched for nannies matching these requirements but couldn't find perfect matches. Please help me find a suitable nanny or suggest how I can adjust my preferences.

Thank you for your assistance!

Best regards,
${fullName}`);
    
    // Open email client with pre-populated email
    window.location.href = `mailto:care@nannygold.co.za?subject=${subject}&body=${body}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-4">
              Unable to load matches. Please try again.
            </p>
            <Button onClick={() => navigate('/nanny-preferences')} className="royal-gradient hover:opacity-90 text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No matches found - show fallback with helpful message
  if (!matchingNannies || matchingNannies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background px-4 py-6">
        <div className="max-w-md mx-auto">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
              <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
              <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
              <div className="w-8 h-2 bg-secondary rounded-full"></div>
              <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
            </div>
          </div>

          {/* No Matches Found */}
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl flex items-center justify-center border border-muted/30">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              No Perfect Matches Found
            </h1>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              We couldn't find nannies matching all your specific requirements right now. 
              This could be due to availability or your specific preferences.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/nanny-preferences')} 
                className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold border-2 border-primary/20 shadow-lg"
              >
                Adjust My Preferences
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full border-border hover:bg-accent"
              >
                Try Again
              </Button>
            </div>
            
            {/* Contact Support Section */}
            <Card className="mt-6 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Mail className="w-5 h-5" />
                    <h3 className="font-semibold text-sm">Need Help Finding a Match?</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Our support team can help you find the perfect nanny. Click below to send us your requirements and we'll get back to you.
                  </p>
                  <Button 
                    onClick={handleContactSupport}
                    className="w-full royal-gradient hover:opacity-90 text-white py-2.5 rounded-lg font-medium text-sm shadow-sm"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <p className="text-xs text-muted-foreground/70">
                    Your profile details will be automatically included
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <p className="text-xs text-muted-foreground mt-6">
              Our team is constantly onboarding new nannies. Try adjusting your preferences or check back later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1.5">
            <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
            <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
            <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
            <div className="w-8 h-2 bg-secondary rounded-full"></div>
            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
          </div>
        </div>

        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-2xl flex items-center justify-center border border-secondary/20 shadow-sm">
            <Heart className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Your Perfect Matches
          </h1>
          <p className="text-muted-foreground text-sm">
            {matchingNannies?.length || 0} nannies found for your family
          </p>
          
          {/* Family Info */}
          {getFamilyInfo().length > 0 && (
            <div className="mt-3 px-4 py-2 bg-card/60 rounded-lg border border-border/60 inline-block">
              <p className="text-sm text-muted-foreground">
                {getFamilyInfo().join(' • ')}
              </p>
            </div>
          )}
          
          {/* Required Services */}
          {getRequiredServices().length > 0 && (
            <div className="mt-4 text-left">
              <p className="text-xs text-muted-foreground mb-2 font-light tracking-wide">Matching your requirements:</p>
              <div className="flex flex-wrap gap-1.5 justify-start">
                {getRequiredServices().map((service, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20 font-light tracking-wide shadow-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {matchingNannies.map((nanny) => {
            // Debug log for each nanny
            console.log(`🔍 Rendering nanny ${nanny.id}:`, {
              hasProfile: !!nanny.profiles,
              firstName: nanny.profiles?.first_name,
              lastName: nanny.profiles?.last_name,
              hasServices: !!nanny.nanny_services,
              rating: nanny.rating
            });
            
            // Extract profile data with better fallbacks
            const firstName = nanny.profiles?.first_name || 'Professional';
            const lastName = nanny.profiles?.last_name || 'Nanny';
            const fullName = `${firstName} ${lastName}`.trim();
            const rating = nanny.rating || 0;
            const totalReviews = nanny.total_reviews || 0;
            const languages = nanny.languages?.length > 0 ? nanny.languages.join(', ') : 'English';
            
            // Log if profile data is missing
            if (!nanny.profiles?.first_name) {
              console.warn(`⚠️ Missing profile data for nanny ${nanny.id}`, {
                hasProfiles: !!nanny.profiles,
                profiles: nanny.profiles
              });
            }
            
            return (
              <Card key={nanny.id} className="rounded-2xl shadow-sm border-border/60 overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4 mb-5">
                    <div className="relative">
                      <img 
                        src={getNannyImage(nanny)} 
                        alt={`${fullName} profile`} 
                        className="w-14 h-14 rounded-xl object-cover border border-border"
                        onError={(e) => {
                          console.log(`❌ Image failed to load for nanny ${nanny.id}`);
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-lg cursor-pointer hover:text-primary transition-colors truncate" 
                          onClick={() => navigate(`/nanny-profile/${nanny.id}`)}>
                        {fullName}
                      </h3>
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-secondary fill-current" />
                          <span className="text-sm font-medium text-foreground">{rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">({totalReviews} reviews)</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        3-6 years • {languages}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
                      <Heart className="w-5 h-5" />
                    </Button>
                  </div>

                {/* Skills & Badges */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {getNannyBadges(nanny).map((badge, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg font-medium border border-primary/20"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className={`grid ${preferences.durationType === 'long_term' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  <Button
                    onClick={() => handleBookNanny(nanny.id)}
                    disabled={bookingStates[nanny.id]}
                    className="royal-gradient hover:opacity-90 text-white rounded-xl text-sm py-2.5 font-medium shadow-sm"
                  >
                    {bookingStates[nanny.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Book'}
                  </Button>
                  
                  {/* Only show Interview button for long-term bookings */}
                  {preferences.durationType === 'long_term' && (
                    <Button
                      onClick={() => handleScheduleInterview(nanny)}
                      variant="outline"
                      className="border-border hover:bg-accent/50 rounded-xl text-sm py-2.5 font-medium"
                    >
                      <Calendar className="w-4 h-4 mr-1.5" />
                      Interview
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>

        {/* Refine Search Button */}
        <Button
          variant="outline"
          onClick={() => navigate('/nanny-preferences')}
          className="w-full mt-8 border-border hover:bg-accent/50 rounded-xl py-3 font-medium"
        >
          Refine Search
        </Button>
      </div>
    </div>
  );
};

export default MatchResults;

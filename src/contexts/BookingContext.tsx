import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBookingFromPreferences } from '@/services/bookingService';
import { saveClientProfile, loadClientProfile, ClientProfileData } from '@/services/clientProfileService';
import { useToast } from '@/hooks/use-toast';
import { validatePricingConsistency, mapDatabaseToPreferences } from "@/utils/dataConsistency";
import { getBookingTypeRate } from '@/utils/pricingUtils';
import { cleanPreferences } from '@/utils/valueUtils';
import { supabase } from '@/integrations/supabase/client';
import { UserPreferences, PricingBreakdown, BookingContextType } from '@/types/booking';

const defaultPreferences: UserPreferences = {
  location: "",
  childrenAges: [],
  specialNeeds: false,
  ecdTraining: false,
  drivingSupport: false,
  cooking: false,
  languages: "",
  personalityValues: [],
  childcareFocusAreas: [],
  montessori: false,
  schedule: {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false
  },
  backupNanny: false
};

// ✅ P6: PRICING STANDARDIZATION NOTE
// Frontend pricing calculations in this context are for PREVIEW/ESTIMATES ONLY
// The database function calculate_booking_revenue() is the SINGLE SOURCE OF TRUTH
// for all financial calculations. These frontend functions are only used to show
// users pricing estimates before booking creation. Once a booking is created,
// all revenue calculations are done server-side and stored in booking_financials.

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

// Helper function to get default hours when time slots are missing
const getDefaultHours = (bookingSubType: string, numberOfDates: number = 1): number => {
  switch (bookingSubType) {
    case 'date_night':
      return 4 * numberOfDates; // 4 hours per date night
    case 'date_day':
    case 'school_holiday':
      return 8 * numberOfDates; // 8 hours per day
    case 'emergency':
      return Math.max(5, 5 * numberOfDates); // Minimum 5 hours for emergency
    default:
      return 8 * numberOfDates; // Default to 8 hours per day
  }
};

// Helper function to calculate total hours for all short-term bookings
const calculateTotalHours = (timeSlots: Array<{ start: string; end: string }>, numberOfDates: number): number => {
  const dailyHours = timeSlots.reduce((total, slot) => {
    const start = new Date(`2000-01-01T${slot.start}:00`);
    const end = new Date(`2000-01-01T${slot.end}:00`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);
  
  return dailyHours * numberOfDates;
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [selectedNanny, setSelectedNanny] = useState<any | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Enhanced nanny selection with persistence
  const setSelectedNannyWithPersistence = (nanny: any) => {
    try {
      setSelectedNanny(nanny);
      
      // Backup nanny data to localStorage
      if (nanny) {
        try {
          localStorage.setItem('selectedNanny', JSON.stringify({
            id: nanny.id,
            profiles: nanny.profiles,
            services: nanny.services,
            timestamp: Date.now()
          }));
          console.log('💾 Nanny data backed up to localStorage');
        } catch (error) {
          console.error('❌ Error backing up nanny data:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error setting selected nanny:', error);
    }
  };

  // Recover nanny data on mount or when needed
  useEffect(() => {
    if (!selectedNanny) {
      try {
        const savedNanny = localStorage.getItem('selectedNanny');
        if (savedNanny) {
          const parsed = JSON.parse(savedNanny);
          // Check if data is not too old (24 hours)
          const isRecent = parsed.timestamp && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000;
          if (isRecent) {
            setSelectedNanny(parsed);
            console.log('✅ Recovered nanny data from localStorage');
          } else {
            localStorage.removeItem('selectedNanny');
            console.log('🗑️ Removed old nanny data from localStorage');
          }
        }
      } catch (error) {
        console.error('❌ Error recovering nanny data:', error);
      }
    }
  }, [selectedNanny]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load profile from database when user is authenticated
  useEffect(() => {
    // Always load profile data when user logs in or when auth state changes
    if (user) {
      console.log('🔄 User authenticated, loading profile from database');
      loadProfileFromDatabase();
    }
  }, [user]); // Trigger on any user change (login/logout)

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    console.log('🔄 Updating preferences:', updates);
    
    setPreferences(prev => {
      const newPreferences = { ...prev, ...updates };
      
      // CRITICAL: Normalize durationType to use underscores
      if (newPreferences.durationType) {
        newPreferences.durationType = newPreferences.durationType.replace('-', '_') as 'short_term' | 'long_term';
        console.log('✅ Normalized durationType to:', newPreferences.durationType);
      }
      
      // CRITICAL: Prevent bookingSubType corruption in long-term flows
      if (newPreferences.durationType === 'long_term') {
        console.log('🚫 Long-term flow detected - clearing bookingSubType to prevent corruption');
        newPreferences.bookingSubType = undefined;
        // Also clear short-term specific fields
        newPreferences.selectedDates = [];
        newPreferences.timeSlots = [];
      }
      
      // Enhanced service mapping with validation
      if (!updates.hasOwnProperty('cooking')) {
        // Automatically map childcareFocusAreas to service preferences only if cooking not explicitly set
        const currentFocusAreas = newPreferences.childcareFocusAreas || [];
        if (currentFocusAreas.includes('food-prep')) {
          newPreferences.cooking = true;
          console.log('✅ Mapped food-prep from childcareFocusAreas to cooking');
        }
        
        // Also check householdSupport array for food-prep
        const householdSupport = newPreferences.householdSupport || [];
        if (householdSupport.includes('food-prep')) {
          newPreferences.cooking = true;
          console.log('✅ Mapped food-prep from householdSupport to cooking');
        }
      }
      
      // Backup preferences to localStorage for recovery
      try {
        localStorage.setItem('bookingPreferences', JSON.stringify(newPreferences));
        console.log('💾 Preferences backed up to localStorage');
      } catch (error) {
        console.error('❌ Error backing up preferences:', error);
      }
      
      return newPreferences;
    });
    
    // Auto-save to database when user is authenticated (with enhanced sync for cooking)
    if (user && updates.hasOwnProperty('cooking')) {
      // For cooking preference, use immediate sync without debounce
      setTimeout(() => saveProfileToDatabase(), 100);
    } else if (user) {
      setTimeout(() => saveProfileToDatabase(), 500); // Debounce other saves
    }
  };

  const saveProfileToDatabase = async () => {
    if (!user) return;

    // Remove blocking validation - allow preference saves always
    const userType = (user.user_metadata as any)?.user_type;
    if (userType !== 'client') return;
    
    console.log('💾 [BookingContext] Auto-saving preferences from booking flow');
    
    try {
      // CRITICAL FIX: Remove address fields if they're empty
      // This prevents BookingContext from wiping existing addresses
      const dataToSave = { ...preferences };
      
      // Check if we have actual address data
      const hasAddressData = 
        preferences.streetAddress?.trim() || 
        preferences.city?.trim() || 
        preferences.province?.trim();
      
      if (!hasAddressData) {
        // Remove address fields - let database preserve existing values
        delete dataToSave.streetAddress;
        delete dataToSave.estateInfo;
        delete dataToSave.suburb;
        delete dataToSave.city;
        delete dataToSave.province;
        delete dataToSave.postalCode;
        delete dataToSave.location;
        console.log('⏭️ [BookingContext] Excluding empty address fields - preserving existing address');
      } else {
        console.log('📍 [BookingContext] Including address data in save');
      }
      
      const result = await saveClientProfile(user.id, dataToSave as ClientProfileData);
      if (!result.success && result.error) {
        console.error('Failed to save profile:', result.error);
        toast({
          title: "Profile Save Error",
          description: "Failed to save your profile. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const loadProfileFromDatabase = async () => {
    if (!user) {
      console.log('⏭️ Skipping profile load - no user authenticated');
      return;
    }
    
    setIsLoadingProfile(true);
    console.log('🔄 Starting profile load for user:', user.id);
    
    try {
      console.log('🔄 Loading profile from database for user:', user.id);
      // Use the complete client profile loading function
      const profileData = await loadClientProfile(user.id);
      
      if (profileData) {
        console.log('✅ Profile data loaded successfully. Keys:', Object.keys(profileData));
        console.log('📊 Profile summary:', {
          hasChildren: !!(profileData.childrenAges?.length > 0),
          hasCooking: !!profileData.cooking,
          hasSchedule: !!profileData.schedule,
          hasLocation: !!profileData.location
        });
        
      const cleanedPrefs = cleanPreferences(preferences);
      
      if (profileData) {
        console.log('✅ Profile data loaded successfully. Keys:', Object.keys(profileData));
        console.log('📊 Profile summary:', {
          hasChildren: !!(profileData.childrenAges?.length > 0),
          hasCooking: !!profileData.cooking,
          hasSchedule: !!profileData.schedule,
          hasLocation: !!profileData.location
        });
        
        // Update preferences with complete profile data, preserving current preferences
        setPreferences(prev => ({
          ...prev,
          location: profileData.location || '',
          // CRITICAL: Load address fields to prevent wipe during auto-save
          streetAddress: profileData.streetAddress || '',
          estateInfo: profileData.estateInfo || '',
          suburb: profileData.suburb || '',
          city: profileData.city || '',
          province: profileData.province || '',
          postalCode: profileData.postalCode || '',
          numberOfChildren: profileData.numberOfChildren || 0,
          childrenAges: profileData.childrenAges || [],
          otherDependents: profileData.otherDependents || 0,
          petsInHome: profileData.petsInHome || '',
          homeSize: profileData.homeSize || '', // This will have the display name
          specialNeeds: profileData.specialNeeds || false,
          ecdTraining: profileData.ecdTraining || false,
          drivingSupport: profileData.drivingSupport || false,
          cooking: profileData.cooking || false, // Ensure cooking preference is loaded correctly
          lightHouseKeeping: profileData.lightHouseKeeping || false,
          errandRuns: profileData.errandRuns || false,
          languages: profileData.languages || '',
          montessori: profileData.montessori || false,
          schedule: profileData.schedule || {
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false,
            sunday: false
          },
          backupNanny: profileData.backupNanny || false,
          livingArrangement: profileData.livingArrangement,
          durationType: profileData.durationType,
          bookingSubType: profileData.bookingSubType,
          selectedDates: profileData.selectedDates || [],
          timeSlots: profileData.timeSlots || []
        }));
        console.log('💾 Preferences updated with loaded data');
      } else {
        console.log('⚠️ No profile data found in database for user:', user.id);
      }
      } else {
        console.log('⚠️ No profile data found in database for user:', user.id);
      }
      
    } catch (error) {
      console.error('❌ Failed to load profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const calculateNannySpecificPricing = (nanny: any): PricingBreakdown => {
    if (!nanny) {
      return calculatePricing(); // Fallback to generic pricing
    }

    // Clean preferences to prevent circular references
    const cleanedPrefs = cleanPreferences(preferences);

    // Use proper base rate calculation based on home size and living arrangement
    const rateInfo = getBookingTypeRate(
      'long_term', 
      cleanedPrefs.homeSize, 
      [], 
      cleanedPrefs.livingArrangement,
      cleanedPrefs.childrenAges || [],
      cleanedPrefs.otherDependents || 0,
      {
        cooking: cleanedPrefs.cooking,
        specialNeeds: cleanedPrefs.specialNeeds,
        drivingSupport: cleanedPrefs.drivingSupport,
        ecdTraining: cleanedPrefs.ecdTraining,
        montessori: cleanedPrefs.montessori,
        backupNanny: cleanedPrefs.backupNanny
      }
    );
    let baseRate = rateInfo.base;
    
    const addOns: Array<{ name: string; price: number }> = [];
    
    // Check for food prep in either cooking preference or householdSupport array
    const hasFoodPrep = cleanedPrefs.cooking || (cleanedPrefs.householdSupport && cleanedPrefs.householdSupport.includes('food-prep'));
    if (hasFoodPrep) {
      addOns.push({ name: "Food Prep", price: 1500 }); // Updated to R1500
    }
    
    if (cleanedPrefs.specialNeeds) {
      addOns.push({ name: "Diverse Ability Support", price: 1500 }); // Updated to R1500
    }

    // Light Housekeeping for long-term bookings - no separate charge as it's included in the monthly rate
    // if (cleanedPrefs.householdSupport?.includes('light-housekeeping')) {
    //   Light housekeeping is included in long-term bookings at no additional charge
    // }
    
    if (cleanedPrefs.drivingSupport) {
      addOns.push({ name: "Driving Support", price: 2000 });
    }
    
    if (cleanedPrefs.ecdTraining) {
      addOns.push({ name: "ECD Training", price: 500 });
    }
    
    if (cleanedPrefs.montessori) {
      addOns.push({ name: "Montessori Training", price: 450 });
    }

    if (cleanedPrefs.backupNanny) {
      addOns.push({ name: "Backup Nanny Service", price: 100 });
    }

    // Add R2000 for driving requirement (shown as separate line item)
    if (cleanedPrefs.drivingRequired) {
      addOns.push({ name: "Transportation Service", price: 2000 });
    }

    const total = baseRate + addOns.reduce((sum, addon) => sum + addon.price, 0);
    
    return { baseRate, addOns, total };
  };

  // ==========================================
  // PHASE 7: SEPARATED PRICING METHODS
  // ==========================================
  
  /**
   * Calculate SHORT-TERM pricing (hourly/daily)
   * Uses shortTermServiceHandler pattern
   */
  const calculateShortTermPricing = (): PricingBreakdown => {
    const cleanedPrefs = cleanPreferences(preferences);
    
    if (cleanedPrefs.bookingSubType === 'date_night' || cleanedPrefs.bookingSubType === 'emergency') {
      // Hourly bookings (date night, emergency)
      let baseHourlyRate = cleanedPrefs.bookingSubType === 'emergency' ? 80 : 120;
      const addOns: Array<{ name: string; price: number }> = [];

      // Map services using short-term handler pattern
      const lightHousekeeping = cleanedPrefs.householdSupport?.includes('light-housekeeping') || false;

      if (cleanedPrefs.cooking) {
        addOns.push({ name: "Cooking/Food-prep", price: 12 });
      }
      
      if (cleanedPrefs.specialNeeds) {
        addOns.push({ name: "Diverse needs support", price: 0 });
      }

      // Light Housekeeping ONLY if selected (daily rate based on home size)
      if (lightHousekeeping && cleanedPrefs.homeSize) {
        const homeSize = cleanedPrefs.homeSize;
        let housekeepingDailyRate = 150; // Default for family_hub
        
        switch (homeSize) {
          case 'pocket_palace':
            housekeepingDailyRate = 80;
            break;
          case 'family_hub':
            housekeepingDailyRate = 150;
            break;
          case 'grand_retreat':
            housekeepingDailyRate = 200;
            break;
          case 'epic_estates':
            housekeepingDailyRate = 300;
            break;
        }
        
        addOns.push({ name: "Light Housekeeping", price: housekeepingDailyRate });
      }

      if (cleanedPrefs.drivingSupport) {
        addOns.push({ name: "Driving Support", price: 25 });
      }

      const totalHours = cleanedPrefs.timeSlots && cleanedPrefs.selectedDates 
        ? calculateTotalHours(cleanedPrefs.timeSlots, cleanedPrefs.selectedDates.length)
        : getDefaultHours(cleanedPrefs.bookingSubType || 'date_night', cleanedPrefs.selectedDates?.length || 1);
      
      const addOnHourlyTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
      const effectiveHourlyRate = baseHourlyRate + addOnHourlyTotal;
      const subtotal = effectiveHourlyRate * totalHours;
      const serviceFee = 35;
      const total = subtotal + serviceFee;

      return { 
        baseRate: baseHourlyRate,
        addOns, 
        total,
        totalHours,
        isHourly: true,
        subtotal,
        serviceFee,
        effectiveHourlyRate
      };
    } else if (cleanedPrefs.bookingSubType === 'temporary_support') {
      // Temporary support: daily rates
      const addOns: Array<{ name: string; price: number }> = [];
      
      if (cleanedPrefs.cooking) {
        addOns.push({ name: "Cooking/Food-prep", price: 120 });
      }
      
      if (cleanedPrefs.specialNeeds) {
        addOns.push({ name: "Diverse needs support", price: 200 });
      }

      if (cleanedPrefs.drivingSupport) {
        addOns.push({ name: "Driving Support", price: 200 });
      }

      const numberOfDays = cleanedPrefs.selectedDates ? cleanedPrefs.selectedDates.length : 0;
      
      let total = 0;
      cleanedPrefs.selectedDates?.forEach((dateStr: string) => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
          total += 350; // Weekend
        } else {
          total += 280; // Weekday
        }
      });
      
      const addOnTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
      const totalWithAddOns = total + (addOnTotal * numberOfDays);

      return { 
        baseRate: total / numberOfDays,
        addOns, 
        total: totalWithAddOns
      };
    } else {
      // Other short-term daily pricing
      let dailyRate = 450;
      const addOns: Array<{ name: string; price: number }> = [];

      if (cleanedPrefs.experienceLevel === '3-6') {
        dailyRate += 50;
      } else if (cleanedPrefs.experienceLevel === '6+') {
        dailyRate += 100;
      }

      const numberOfChildren = cleanedPrefs.childrenAges ? countChildren(cleanedPrefs.childrenAges) : 0;
      if (numberOfChildren > 3) {
        const extraChildren = numberOfChildren - 3;
        const extraChildrenCost = extraChildren * 50;
        addOns.push({ name: `Extra Children (${extraChildren})`, price: extraChildrenCost });
      }

      if (cleanedPrefs.drivingSupport) {
        addOns.push({ name: "Driving Support", price: 100 });
      }
      
      if (cleanedPrefs.specialNeeds) {
        addOns.push({ name: "Diverse Ability Support", price: 100 });
      }

      const numberOfDays = cleanedPrefs.selectedDates ? cleanedPrefs.selectedDates.length : 0;
      const addOnTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
      const total = (dailyRate + addOnTotal) * numberOfDays;

      return { baseRate: dailyRate, addOns, total };
    }
  };

  /**
   * Calculate LONG-TERM pricing (monthly + placement fee)
   * Uses longTermServiceHandler pattern
   */
  const calculateLongTermPricing = (): PricingBreakdown => {
    const cleanedPrefs = cleanPreferences(preferences);
    
    const rateInfo = getBookingTypeRate(
      'long_term', 
      cleanedPrefs.homeSize, 
      [], 
      cleanedPrefs.livingArrangement,
      cleanedPrefs.childrenAges || [],
      cleanedPrefs.otherDependents || 0,
      {
        cooking: cleanedPrefs.cooking,
        specialNeeds: cleanedPrefs.specialNeeds,
        drivingSupport: cleanedPrefs.drivingSupport,
        ecdTraining: cleanedPrefs.ecdTraining,
        montessori: cleanedPrefs.montessori,
        backupNanny: cleanedPrefs.backupNanny
      }
    );
    let baseRate = rateInfo.base;
    
    const addOns: Array<{ name: string; price: number }> = [];

    // Experience level pricing
    if (cleanedPrefs.experienceLevel === '3-6') {
      baseRate += 250;
    } else if (cleanedPrefs.experienceLevel === '6+') {
      baseRate += 500;
    }

    // Add-on services for long-term
    // NOTE: Light housekeeping is INCLUDED in monthly rate, no extra charge
    
    if (cleanedPrefs.drivingSupport) {
      addOns.push({ name: "Driving Support", price: 2000 });
    }
    
    if (cleanedPrefs.cooking) {
      addOns.push({ name: "Food Prep", price: 1500 });
    }
    
    if (cleanedPrefs.specialNeeds) {
      addOns.push({ name: "Diverse Ability Support", price: 1500 });
    }
    
    if (cleanedPrefs.ecdTraining) {
      addOns.push({ name: "ECD Training", price: 500 });
    }
    
    if (cleanedPrefs.montessori) {
      addOns.push({ name: "Montessori Training", price: 450 });
    }

    if (cleanedPrefs.backupNanny) {
      addOns.push({ name: "Backup Nanny Service", price: 100 });
    }

    if (cleanedPrefs.drivingRequired) {
      addOns.push({ name: "Transportation Service", price: 2000 });
    }

    const addOnTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
    const total = baseRate + addOnTotal;

    return { baseRate, addOns, total };
  };

  /**
   * Main pricing router - directs to appropriate pricing method
   */
  const calculatePricing = (): PricingBreakdown => {
    const cleanedPrefs = cleanPreferences(preferences);
    
    // Route to appropriate pricing method based on duration type
    if (cleanedPrefs.durationType === 'short_term') {
      return calculateShortTermPricing();
    } else {
      return calculateLongTermPricing();
    }
  };

  const createBooking = async (nannyId: string) => {
    // Prevent duplicate bookings if already creating
    if (isCreatingBooking) {
      console.log('⚠️ Booking creation already in progress, skipping duplicate');
      return;
    }

    // Phase 4: Add validation for booking type and required fields
    if (preferences.durationType === 'short_term') {
      if (!preferences.bookingSubType) {
        throw new Error('Short-term booking requires a booking type selection');
      }
      if (!preferences.selectedDates?.length) {
        throw new Error('Short-term booking requires date selection');
      }
      if (!preferences.timeSlots?.length) {
        throw new Error('Short-term booking requires time slot selection');
      }
    }

    setIsCreatingBooking(true);
    
    try {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a booking.",
          variant: "destructive"
        });
        throw new Error('User not authenticated');
      }

      console.log('🎯 Creating booking for nanny:', nannyId);
      console.log('📋 Current preferences:', preferences);

      // CRITICAL: Ensure durationType is set with proper fallback
      const bookingPreferences = {
        ...preferences,
        durationType: preferences.durationType || 
                     (preferences.bookingSubType ? 'short_term' : 'long_term')
      };
      
      console.log('📋 Final booking preferences with durationType:', bookingPreferences);

      const booking = await createBookingFromPreferences(bookingPreferences, nannyId, user.id);
      console.log('✅ Booking created successfully:', booking);
      
      toast({
        title: "Booking created",
        description: "Your booking has been created successfully!"
      });
      
      return booking;
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create booking. Please try again.",
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const contextValue: BookingContextType = {
    preferences,
    updatePreferences,
    selectedNanny,
    setSelectedNanny: setSelectedNannyWithPersistence,
    saveProfileToDatabase,
    loadProfileFromDatabase,
    calculatePricing,
    calculateNannySpecificPricing,
    createBooking,
    isCreatingBooking,
    isLoadingProfile
  };

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PricingRequest {
  bookingType: 'emergency' | 'date_night' | 'date_day' | 'temporary_support';
  totalHours?: number;
  totalDays?: number;
  services: {
    cooking?: boolean;
    specialNeeds?: boolean;
    petCare?: boolean;
    lightHousekeeping?: boolean;
  };
  homeSize?: string;
  selectedDates?: string[];
}

interface PricingResponse {
  baseHourlyRate: number;
  services: Array<{ name: string; hourlyRate: number; totalCost: number }>;
  subtotal: number;
  serviceFee: number;
  emergencySurcharge?: number;
  total: number;
  effectiveHourlyRate: number;
}

Deno.serve(async (req) => {
  console.log('Calculate hourly pricing function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    const { bookingType, totalHours, totalDays, services, homeSize, selectedDates }: PricingRequest = requestBody;

    console.log('Pricing request:', { bookingType, totalHours, totalDays, services, homeSize, selectedDates });

    // Validate input - different validation for hourly vs daily bookings
    if (!bookingType) {
      return new Response(
        JSON.stringify({ error: 'Invalid booking type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Gap Coverage (temporary_support) validation - minimum 5 consecutive days
    if (bookingType === 'temporary_support') {
      if (!selectedDates || selectedDates.length < 5) {
        return new Response(
          JSON.stringify({ error: 'Gap Coverage requires a minimum of 5 consecutive days' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // Hourly booking validation
      if (!totalHours || totalHours <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid hours for hourly booking' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Prevent unreasonable hour calculations (max 720 hours = 30 days * 24 hours)
      if (totalHours > 720) {
        console.log('⚠️ Total hours exceeds reasonable limit:', totalHours, 'Capping at 720 hours');
        totalHours = 720;
      }

      // Emergency booking validation - minimum 5 hours
      if (bookingType === 'emergency' && totalHours < 5) {
        return new Response(
          JSON.stringify({ error: 'Emergency bookings require a minimum of 5 hours' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Date night booking validation - minimum 3 hours
      if (bookingType === 'date_night' && totalHours < 3) {
        return new Response(
          JSON.stringify({ error: 'Date night bookings require a minimum of 3 hours' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Handle Gap Coverage (daily rates) vs Hourly bookings
    if (bookingType === 'temporary_support') {
      // Gap Coverage: Daily rates - R280 weekday, R350 weekend (Fri/Sat/Sun)
      let totalCost = 0;
      const breakdown: Array<{ date: string; rate: number; isWeekend: boolean }> = [];
      
      selectedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        const rate = isWeekend ? 350 : 280;
        
        totalCost += rate;
        breakdown.push({ date: dateStr, rate, isWeekend });
      });

      // Add Light Housekeeping based on home size (daily rates)
      const serviceCharges: Array<{ name: string; hourlyRate: number; totalCost: number }> = [];
      
      if (services.lightHousekeeping && homeSize) {
        let dailyHousekeepingRate = 100; // Default for family_hub
        
        switch (homeSize.toLowerCase()) {
          case 'pocket_palace':
            dailyHousekeepingRate = 80;
            break;
          case 'family_hub':
            dailyHousekeepingRate = 100;
            break;
          case 'grand_estate':
            dailyHousekeepingRate = 120;
            break;
          case 'monumental_manor':
            dailyHousekeepingRate = 140;
            break;
          case 'epic_estates':
            dailyHousekeepingRate = 300;
            break;
          default:
            console.warn(`⚠️ Unknown home size: ${homeSize}, using default rate R100`);
        }
        
        console.log(`🏠 Light Housekeeping - Home: ${homeSize}, Rate: R${dailyHousekeepingRate}/day, Days: ${selectedDates.length}`);
        
        const totalHousekeepingCost = dailyHousekeepingRate * selectedDates.length;
        serviceCharges.push({
          name: 'Light Housekeeping (cleaning, laundry, ironing)',
          hourlyRate: dailyHousekeepingRate, // Daily rate stored in hourlyRate field
          totalCost: totalHousekeepingCost
        });
        totalCost += totalHousekeepingCost;
      }

      // Add cooking service (R100/day flat rate for temporary_support)
      if (services.cooking) {
        const dailyCookingRate = 100; // R100/day flat rate
        const totalCookingCost = dailyCookingRate * selectedDates.length;
        serviceCharges.push({
          name: 'Cooking/Food-prep (daily)',
          hourlyRate: dailyCookingRate,
          totalCost: totalCookingCost
        });
        totalCost += totalCookingCost;
      }

      // Diverse Ability Support - R0 additional cost
      if (services.specialNeeds) {
        serviceCharges.push({
          name: 'Diverse Ability Support',
          hourlyRate: 0,
          totalCost: 0
        });
      }

      // Service fee is WAIVED for Gap Coverage
      const serviceFee = 0;

      return new Response(
        JSON.stringify({
          baseHourlyRate: 0, // N/A for daily rates
          services: serviceCharges,
          subtotal: totalCost,
          serviceFee,
          total: totalCost,
          effectiveHourlyRate: 0, // N/A for daily rates
          dailyBreakdown: breakdown
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Hourly bookings (Emergency, Date Night, Date Day)
    // Check for weekend rate (Friday, Saturday, Sunday) for date_day
    // CRITICAL: Convert to SAST (UTC+2) timezone for accurate day detection
    const isWeekendBooking = (bookingType: string, selectedDates: string[] = []): boolean => {
      if (bookingType !== 'date_day') return false;
      
      return selectedDates.some(dateStr => {
        // Parse ISO date directly (already in format: "2025-11-20T22:00:00.000Z")
        const date = new Date(dateStr);
        
        // Convert to SAST (UTC+2) for South African timezone
        const sastOffset = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        const sastDate = new Date(date.getTime() + sastOffset);
        const dayOfWeek = sastDate.getUTCDay(); // 0=Sunday, 5=Friday, 6=Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        
        console.log(`🔍 Weekend Detection - Date: ${dateStr}, SAST Day: ${dayOfWeek} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}), IsWeekend: ${isWeekend}`);
        return isWeekend;
      });
    };

    // Check for weekend FIRST before assigning base rate
    const isWeekend = isWeekendBooking(bookingType, selectedDates || []);
    
    // Base hourly rate - updated rates per new pricing structure
    let baseHourlyRate = 40; // R40/hour standard date_day rate
    if (bookingType === 'emergency') {
      baseHourlyRate = 80; // R80/hour emergency rate
    } else if (bookingType === 'date_night') {
      baseHourlyRate = 120; // R120/hour date night rate
    } else if (isWeekend) {
      // Weekend rate for date_day bookings (Friday/Saturday/Sunday)
      baseHourlyRate = 55; // R55/hour weekend rate
    }
    
    console.log(`💰 Base rate selected: R${baseHourlyRate}/hr (bookingType: ${bookingType}, isWeekend: ${isWeekend})`);
    
    // Service pricing - Cooking is R100/day for ALL short-term services
    const servicePricing = {
      cooking: 100,        // R100/day for cooking (daily rate, not hourly)
      specialNeeds: 0,     // No additional charge for diverse ability support in short-term
      petCare: 0          // Free
    };

    // Calculate service costs
    const serviceCharges: Array<{ name: string; hourlyRate: number; totalCost: number }> = [];
    let serviceHourlyTotal = 0;

    // Cooking is R100/day flat rate for ALL short-term services
    if (services.cooking) {
      const dailyCookingRate = servicePricing.cooking; // R100/day
      const numDays = selectedDates?.length || 1;
      serviceCharges.push({
        name: 'Cooking/Food-prep (daily)',
        hourlyRate: dailyCookingRate, // Store as daily rate for display
        totalCost: dailyCookingRate * numDays // Multiply by days, not hours
      });
      // Don't add to serviceHourlyTotal since it's a daily rate, not hourly
    }

    if (services.specialNeeds) {
      const hourlyRate = servicePricing.specialNeeds;
      serviceCharges.push({
        name: 'Diverse Ability Support',
        hourlyRate,
        totalCost: hourlyRate * totalHours
      });
      serviceHourlyTotal += hourlyRate; // This will be 0, so no cost added
    }

    if (services.petCare) {
      const hourlyRate = servicePricing.petCare;
      serviceCharges.push({
        name: 'Pet-Savvy (Free)',
        hourlyRate,
        totalCost: hourlyRate * totalHours
      });
      serviceHourlyTotal += hourlyRate;
    }

    // Add Light Housekeeping for hourly bookings (daily rates even for hourly bookings)
    if (services.lightHousekeeping && homeSize && selectedDates) {
      let dailyHousekeepingRate = 100; // Default for family_hub
      
      switch (homeSize.toLowerCase()) {
        case 'pocket_palace':
          dailyHousekeepingRate = 80;
          break;
        case 'family_hub':
          dailyHousekeepingRate = 100;
          break;
        case 'grand_estate':
          dailyHousekeepingRate = 120;
          break;
        case 'monumental_manor':
          dailyHousekeepingRate = 140;
          break;
        case 'epic_estates':
          dailyHousekeepingRate = 300;
          break;
        default:
          console.warn(`⚠️ Unknown home size: ${homeSize}, using default rate R100`);
      }
      
      console.log(`🏠 Light Housekeeping - Home: ${homeSize}, Rate: R${dailyHousekeepingRate}/day, Days: ${selectedDates.length}`);
      
      const totalHousekeepingCost = dailyHousekeepingRate * selectedDates.length;
      serviceCharges.push({
        name: 'Light Housekeeping (cleaning, laundry, ironing)',
        hourlyRate: dailyHousekeepingRate, // Store daily rate in hourlyRate field for display
        totalCost: totalHousekeepingCost
      });
    }

    // Calculate subtotal
    const effectiveHourlyRate = baseHourlyRate + serviceHourlyTotal;
    let subtotal = effectiveHourlyRate * totalHours;

    // Add Light Housekeeping cost to subtotal
    const housekeepingCost = serviceCharges.find(s => s.name.includes('Light Housekeeping'))?.totalCost || 0;
    subtotal += housekeepingCost;

    // Add R35 service fee for all short-term hourly bookings
    const serviceFee = 35;
    
    // No emergency surcharge needed - emergency rate is already R80/hr base
    let emergencySurcharge = 0;

    const total = subtotal + serviceFee + emergencySurcharge;
    const finalHourlyRate = total / totalHours;

    // Final pricing debug log after all calculations
    console.log('🔍 Final Pricing Debug:', {
      bookingType,
      selectedDate: selectedDates?.[0],
      isWeekend,
      baseHourlyRate,
      totalHours,
      baseCalculation: `${totalHours}hrs × R${baseHourlyRate}/hr = R${baseHourlyRate * totalHours}`,
      serviceHourlyTotal,
      housekeepingCost,
      subtotal,
      serviceFee,
      total,
      effectiveHourlyRate: Math.round((total / totalHours) * 100) / 100
    });

    const response: PricingResponse = {
      baseHourlyRate,
      services: serviceCharges,
      subtotal,
      serviceFee,
      emergencySurcharge: emergencySurcharge > 0 ? emergencySurcharge : undefined,
      total,
      effectiveHourlyRate: Math.round(finalHourlyRate * 100) / 100
    };

    console.log('Pricing calculation result:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error calculating hourly pricing:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to calculate pricing',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
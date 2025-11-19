import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientTimezone, bookingType } = await req.json();
    
    console.log('Calculating booking time for:', { clientTimezone, bookingType });
    
    // Get current time in client's timezone
    const now = new Date();
    
    // Convert current time to client's timezone
    const nowInClientTZ = new Date(now.toLocaleString("en-US", {timeZone: clientTimezone}));
    
    // For emergency bookings, start time is 4 hours from now in client's timezone
    // For other bookings, we can use the same logic or customize as needed
    const startTime = new Date(nowInClientTZ.getTime() + 4 * 60 * 60 * 1000);
    
    // Minimum duration is 4 hours for emergency, can be customized for other types
    const minDuration = bookingType === 'emergency' ? 4 : 2;
    const endTime = new Date(startTime.getTime() + minDuration * 60 * 60 * 1000);
    
    // Format times for HTML time inputs (HH:MM format) in client's timezone
    const startTimeFormatted = startTime.toTimeString().slice(0, 5);
    const endTimeFormatted = endTime.toTimeString().slice(0, 5);
    
    // Check if current time allows emergency booking (5am-7am restriction) in client's timezone
    const currentHour = nowInClientTZ.getHours();
    const canBookEmergency = currentHour >= 5 && currentHour <= 7;
    
    const response = {
      success: true,
      data: {
        currentTime: now.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        startTimeFormatted,
        endTimeFormatted,
        canBookEmergency,
        clientTimezone,
        message: bookingType === 'emergency' && !canBookEmergency 
          ? "Emergency bookings can only be made between 5:00 AM and 7:00 AM"
          : "Booking time calculated successfully"
      }
    };
    
    console.log('Booking time calculation result:', response);
    
    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Error calculating booking time:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
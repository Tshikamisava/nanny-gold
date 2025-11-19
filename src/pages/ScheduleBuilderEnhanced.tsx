import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@/contexts/BookingContext";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { isEmergencyBookingTimeWindow, getNextEmergencyBookingWindow } from "@/utils/bookingValidation";

const ScheduleBuilder = () => {
  const navigate = useNavigate();
  const {
    preferences,
    updatePreferences
  } = useBooking();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<Array<{
    start: string;
    end: string;
  }>>([]);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [breakPreference, setBreakPreference] = useState<string>('3-in-1-out');
  const [customBreakArrangement, setCustomBreakArrangement] = useState<string>('');
  const [isEmergencyBooking, setIsEmergencyBooking] = useState(false);

  useEffect(() => {
    // Check if this is an emergency booking
    if (preferences.bookingSubType === 'emergency') {
      setIsEmergencyBooking(true);
      // Pre-fill with emergency time constraints
      if (preferences.selectedDates && preferences.selectedDates.length > 0) {
        setSelectedDates([new Date(preferences.selectedDates[0])]);
      }
      if (preferences.timeSlots && preferences.timeSlots.length > 0) {
        setTimeSlots(preferences.timeSlots);
      }
    }
  }, [preferences]);

  const handleSubmit = () => {
    if (isEmergencyBooking) {
      // For emergency bookings, save the time slots and proceed
      updatePreferences({
        selectedDates: selectedDates.map(date => date.toISOString()),
        timeSlots: timeSlots
      });
    } else {
      // Regular booking flow
      updatePreferences({
        selectedDates: selectedDates.map(date => date.toISOString()),
        startTime: startTime,
        breakPreference: breakPreference,
        customBreakArrangement: customBreakArrangement
      });
    }
    console.log("Schedule data:", {
      selectedDates,
      timeSlots,
      backupNanny: preferences.backupNanny,
      breakPreference,
      customBreakArrangement
    });
    navigate('/nanny-preferences');
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setSelectedDates(dates);
    }
  };

  const handleSingleDateSelect = (date: Date | undefined) => {
    if (date) {
      if (preferences.livingArrangement === 'live-in') {
        // For live-in positions, automatically book the next year
        const startDate = date;
        const endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + 1);

        // Generate all dates for the next year
        const yearDates = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          yearDates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        setSelectedDates(yearDates);
      } else {
        // For live-out long-term positions, just select the start date
        setSelectedDates([date]);
      }
    }
  };

  const addTimeSlot = () => {
    // Use the validation function to check if emergency booking is allowed
    if (!isEmergencyBookingTimeWindow()) {
      const nextWindow = getNextEmergencyBookingWindow();
      alert(`Emergency bookings can only be made between 5:00 AM and 7:00 AM. Next window: ${nextWindow}`);
      return;
    }

    const now = new Date();
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const defaultStart = threeHoursLater.toTimeString().slice(0, 5);

    // Minimum 5 hours duration for emergency
    const minEndTime = new Date(threeHoursLater.getTime() + 5 * 60 * 60 * 1000);
    const defaultEnd = minEndTime.toTimeString().slice(0, 5);
    setTimeSlots([...timeSlots, {
      start: defaultStart,
      end: defaultEnd
    }]);
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...timeSlots];
    newSlots[index][field] = value;
    setTimeSlots(newSlots);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50 px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="mr-4">
            <ChevronLeft className="h-6 w-6 text-purple-900" />
          </button>
          <h1 className="text-xl font-semibold text-purple-900">
            When do you need your Nanny?
          </h1>
        </div>

        {/* Updated Nanny Availability Notice */}
        {!isEmergencyBooking && (
          <div className="bg-white royal-shadow rounded-xl p-4 mb-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Nanny Availability</h3>
            <p className="text-sm text-purple-700">
              <strong>Work Schedule:</strong> All nannies work Monday through Friday. Even while in the client's home during weekends, the Nanny should be allowed some hours off for recovery and personal time.
            </p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-purple-900 mb-2">Select nanny's start date</h2>
          {isEmergencyBooking && (
            <p className="text-sm text-red-600 font-medium">
              Emergency booking - immediate response required
            </p>
          )}
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-xl royal-shadow p-4 mb-6">
          <Calendar 
            mode="single" 
            selected={selectedDates[0]} 
            onSelect={handleSingleDateSelect} 
            disabled={isEmergencyBooking ? date => date.toDateString() !== new Date().toDateString() : undefined} 
            className="w-full" 
            classNames={{
              months: "flex flex-col space-y-4",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center mb-4",
              caption_label: "text-lg font-semibold text-purple-900",
              nav: "space-x-1 flex items-center",
              nav_button: "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 text-purple-900",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-purple-900 rounded-md w-10 font-medium text-sm",
              row: "flex w-full mt-2",
              cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: "h-10 w-10 p-0 font-normal hover:bg-purple-100 rounded-full flex items-center justify-center",
              day_selected: "bg-yellow-400 text-purple-900 hover:bg-yellow-400 hover:text-purple-900 focus:bg-yellow-400 focus:text-purple-900 rounded-full",
              day_today: "bg-purple-100 text-purple-900 font-semibold",
              day_outside: "text-gray-400 opacity-50",
              day_disabled: "text-gray-400 opacity-50",
              day_range_middle: "aria-selected:bg-purple-100 aria-selected:text-purple-900",
              day_hidden: "invisible"
            }} 
            components={{
              IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" {...props} />,
              IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" {...props} />
            }} 
            numberOfMonths={isEmergencyBooking ? 1 : 2} 
          />
          
          {isEmergencyBooking && selectedDates.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">
                <strong>Today:</strong> {format(selectedDates[0], 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          )}
          
          {preferences.livingArrangement === 'live-in' && selectedDates.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                <strong>Ongoing Position:</strong> Automatically booked for 1 full year ({selectedDates.length} days) starting {format(selectedDates[0], 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Start Time Section - Show for non-emergency bookings */}
        {!isEmergencyBooking && selectedDates.length > 0 && (
          <div className="bg-white rounded-xl royal-shadow p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-900" />
              <h3 className="text-lg font-semibold text-purple-900">Start Time</h3>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-900 mb-2">
                What time should the nanny start on {format(selectedDates[0], 'EEEE, MMMM d')}?
              </label>
              <input 
                type="time" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)} 
                className="w-full p-3 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200" 
                min="06:00" 
                max="20:00" 
              />
            </div>
          </div>
        )}

        {/* Enhanced Break Schedule Section - Show for live-in positions only */}
        {!isEmergencyBooking && preferences.livingArrangement === 'live-in' && selectedDates.length > 0 && (
          <div className="bg-white rounded-xl royal-shadow p-4 mb-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Break Schedule</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-900 mb-3">
                When would you prefer the nanny to take breaks?
              </label>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="breakPreference" 
                    value="3-in-1-out" 
                    checked={breakPreference === '3-in-1-out'} 
                    onChange={e => setBreakPreference(e.target.value)} 
                    className="w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-500" 
                  />
                  <span className="ml-3 text-sm text-purple-900">3 weekends in, 1 weekend out</span>
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="breakPreference" 
                    value="2-in-2-out" 
                    checked={breakPreference === '2-in-2-out'} 
                    onChange={e => setBreakPreference(e.target.value)} 
                    className="w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-500" 
                  />
                  <span className="ml-3 text-sm text-purple-900">2 weekends in, 2 weekends out</span>
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="breakPreference" 
                    value="1-in-3-out" 
                    checked={breakPreference === '1-in-3-out'} 
                    onChange={e => setBreakPreference(e.target.value)} 
                    className="w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-500" 
                  />
                  <span className="ml-3 text-sm text-purple-900">1 weekend in, 3 weekends out</span>
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="breakPreference" 
                    value="all-weekends-out" 
                    checked={breakPreference === 'all-weekends-out'} 
                    onChange={e => setBreakPreference(e.target.value)} 
                    className="w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-500" 
                  />
                  <span className="ml-3 text-sm text-purple-900">All weekends out</span>
                </label>
              </div>
              
              {/* Custom Breaks Section */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-purple-900 mb-3">
                  Custom Break Arrangements (Optional)
                </label>
                <textarea 
                  placeholder="Describe any specific break arrangements or special requirements..."
                  value={customBreakArrangement}
                  onChange={e => setCustomBreakArrangement(e.target.value)}
                  className="w-full p-3 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 min-h-[80px] resize-none text-sm"
                  rows={3}
                />
                <p className="text-xs text-purple-600 mt-2">
                  Let us know if you have specific break scheduling needs that don't fit the standard options above.
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700">
                <strong>Note:</strong> Break schedule applies to weekend time off. Your nanny will work Monday through Friday as standard.
              </p>
            </div>
          </div>
        )}

        {/* Time Slots Section - Show for emergency bookings */}
        {isEmergencyBooking && (
          <div className="bg-white rounded-xl royal-shadow p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-900" />
              <h3 className="text-lg font-semibold text-purple-900">Emergency Time Slot</h3>
            </div>
            
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center space-x-2 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-purple-900 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={slot.start} 
                    onChange={e => updateTimeSlot(index, 'start', e.target.value)} 
                    className="w-full p-2 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200" 
                    min="00:00" 
                    max="23:59" 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-purple-900 mb-1">End Time</label>
                  <input 
                    type="time" 
                    value={slot.end} 
                    onChange={e => updateTimeSlot(index, 'end', e.target.value)} 
                    className="w-full p-2 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200" 
                    min="00:00" 
                    max="23:59" 
                  />
                </div>
                {timeSlots.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeTimeSlot(index)} 
                    className="border-red-300 text-red-600 hover:bg-red-50 mt-6"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            
            {timeSlots.length === 0 && (
              <Button 
                variant="outline" 
                onClick={addTimeSlot} 
                className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                Add Time Slot
              </Button>
            )}
            
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700">
                <strong>Note:</strong> Emergency bookings can only be made between 5:00 AM - 7:00 AM. Start time is 3 hours from booking confirmation with minimum 5-hour duration.
              </p>
            </div>
          </div>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={selectedDates.length === 0 || (isEmergencyBooking && timeSlots.length === 0)} 
          className="w-full mt-6 py-4 text-lg font-semibold rounded-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
        >
          {isEmergencyBooking ? "Confirm Emergency Booking" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default ScheduleBuilder;
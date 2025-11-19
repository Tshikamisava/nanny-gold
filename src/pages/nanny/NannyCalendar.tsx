import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Clock, Settings, Plus, User, VideoIcon, X, CalendarDays, Repeat, MapPin, Timer } from 'lucide-react';
import { format, isToday, isSameDay, addDays, startOfMonth, endOfMonth, getDay, isAfter, isBefore } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNannyAvailability, useAvailabilityRange, useBlockTime, useCheckConflicts } from '@/hooks/useNannyAvailability';
import WeeklyScheduleBuilder from '@/components/calendar/WeeklyScheduleBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DayEvent {
  id: string;
  type: 'booking' | 'interview' | 'blocked';
  startTime: string;
  endTime?: string;
  title: string;
  status: string;
  client?: string;
  location?: string;
  familyInfo?: string;
  homeSize?: string;
  services?: string[];
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  isLongTerm?: boolean;
  bookingStartDate?: string;
  bookingEndDate?: string;
}

export default function NannyCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isScheduleBuilderOpen, setIsScheduleBuilderOpen] = useState(false);
  const [isDateDetailsOpen, setIsDateDetailsOpen] = useState(false);
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  
  const { user } = useAuth();
  
  // Fetch bookings with client profile joins
  const { data: bookings = [] } = useQuery({
    queryKey: ['nanny-calendar-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          clients!inner(
            id,
            home_size,
            number_of_children,
            children_ages,
            other_dependents,
            pets_in_home
          ),
          profiles!client_id(
            first_name,
            last_name,
            email,
            phone,
            location
          ),
          client_preferences!client_id(
            cooking,
            light_house_keeping,
            driving_support,
            special_needs,
            ecd_training,
            montessori,
            pet_care,
            errand_runs
          )
        `)
        .eq('nanny_id', user?.id)
        .in('status', ['confirmed', 'active', 'pending']);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  
  // Fetch interviews with client profile joins
  const { data: interviews = [] } = useQuery({
    queryKey: ['nanny-calendar-interviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          profiles!client_id(
            first_name,
            last_name,
            email
          )
        `)
        .eq('nanny_id', user?.id)
        .in('status', ['scheduled', 'confirmed']);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  
  const { data: availability } = useNannyAvailability();
  const { data: availabilityRange } = useAvailabilityRange(
    startOfMonth(selectedDate), 
    endOfMonth(selectedDate)
  );
  
  const blockTime = useBlockTime();
  const checkConflicts = useCheckConflicts();

  // Setup realtime subscriptions for bookings and interviews
  useEffect(() => {
    if (!user) return;

    const bookingsChannel = supabase
      .channel('calendar-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `nanny_id=eq.${user.id}`
        },
        () => {
          // Refetch bookings when changes occur
          window.location.reload(); // Simple refresh for now
        }
      )
      .subscribe();

    const interviewsChannel = supabase
      .channel('calendar-interviews')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews',
          filter: `nanny_id=eq.${user.id}`
        },
        () => {
          // Refetch interviews when changes occur
          window.location.reload(); // Simple refresh for now
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(interviewsChannel);
    };
  }, [user]);

  // Block day/hour functions using new hooks
  const handleBlockDay = async () => {
    if (blockDate) {
      try {
        await blockTime.mutateAsync({
          dates: [format(blockDate, 'yyyy-MM-dd')],
          isFullDay: true
        });
        setIsBlockDialogOpen(false);
        setBlockDate(undefined);
        setSelectedHours([]);
      } catch (error) {
        console.error('Error blocking day:', error);
      }
    }
  };

  const handleBlockHours = async () => {
    if (blockDate && selectedHours.length > 0) {
      try {
        await blockTime.mutateAsync({
          dates: [format(blockDate, 'yyyy-MM-dd')],
          hours: selectedHours,
          isFullDay: false
        });
        setIsBlockDialogOpen(false);
        setBlockDate(undefined);
        setSelectedHours([]);
      } catch (error) {
        console.error('Error blocking hours:', error);
      }
    }
  };

  const toggleHourSelection = (hour: number) => {
    setSelectedHours(prev => 
      prev.includes(hour) 
        ? prev.filter(h => h !== hour)
        : [...prev, hour]
    );
  };

  const isHourBlocked = (date: Date, hour: number) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayAvailability = availabilityRange?.find(slot => slot.date_available === dateKey);
    const timeSlots = dayAvailability?.blocked_slots || [];
    return Array.isArray(timeSlots) ? timeSlots.includes(hour) : false;
  };

  const isDayBlocked = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return availability?.unavailable_dates?.includes(dateKey) || false;
  };

  // Get events for selected date with enhanced data
  const getEventsForDate = (date: Date): DayEvent[] => {
    const events: DayEvent[] = [];
    
  // Add bookings for the date with enhanced client info
  bookings.forEach(booking => {
    const bookingStart = new Date(booking.start_date);
    const bookingEnd = booking.end_date ? new Date(booking.end_date) : null;
    
    // Get client name from profiles join
    const clientProfile = booking.profiles as any;
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Client Family'
      : 'Client Family';
    
    // Extract full address from location
    const clientLocation = clientProfile?.location;
    const fullAddress = clientLocation 
      ? (() => {
          try {
            const loc = typeof clientLocation === 'string' ? JSON.parse(clientLocation) : clientLocation;
            const parts = [];
            if (loc.street?.trim()) parts.push(loc.street.trim());
            if (loc.suburb?.trim()) parts.push(loc.suburb.trim());
            if (loc.city?.trim()) parts.push(loc.city.trim());
            return parts.join(', ') || 'Client Home';
          } catch {
            return 'Client Home';
          }
        })()
      : 'Client Home';
    
    // Extract family details
    const clientData = booking.clients as any;
    const familyInfo = clientData 
      ? `${clientData.number_of_children || 0} ${clientData.number_of_children === 1 ? 'child' : 'children'}${
          (clientData.children_ages || []).length > 0 ? ` (ages ${(clientData.children_ages || []).join(', ')})` : ''
        }`
      : '';
    const homeSize = clientData?.home_size || '';
    
    // Extract service requirements
    const preferences = booking.client_preferences as any;
    const services = [];
    if (preferences?.cooking) services.push('Cooking');
    if (preferences?.light_house_keeping) services.push('Light Housekeeping');
    if (preferences?.driving_support) services.push('Driving');
    if (preferences?.special_needs) services.push('Diverse Ability Support');
    if (preferences?.ecd_training) services.push('ECD Training');
    if (preferences?.montessori) services.push('Montessori');
    if (preferences?.pet_care) services.push('Pet Care');
    if (preferences?.errand_runs) services.push('Errands');
    
    // Living arrangement display
    const livingType = booking.living_arrangement === 'live-in' ? ' (Live-in)' : 
                      booking.living_arrangement === 'live-out' ? ' (Live-out)' : '';
    
    // For long-term bookings, show on all days within range
    if (bookingEnd && isAfter(bookingEnd, bookingStart)) {
      if (isSameDay(bookingStart, date) || (isAfter(date, bookingStart) && isBefore(date, bookingEnd)) || isSameDay(bookingEnd, date)) {
        const priority = booking.booking_type === 'emergency' ? 'emergency' : 
                        booking.status === 'confirmed' ? 'high' : 
                        booking.status === 'pending' ? 'medium' : 'low';
        
        events.push({
          id: booking.id,
          type: 'booking',
          startTime: '09:00',
          endTime: '17:00',
          title: `${booking.booking_type === 'emergency' ? 'Emergency' : 'Long-term'}${livingType}`,
          status: booking.status,
          client: clientName,
          location: fullAddress,
          familyInfo,
          homeSize,
          services,
          priority,
          isLongTerm: true,
          bookingStartDate: format(bookingStart, 'MMM d'),
          bookingEndDate: format(bookingEnd, 'MMM d')
        });
      }
    } else if (isSameDay(bookingStart, date)) {
      // Single day booking
      const priority = booking.booking_type === 'emergency' ? 'emergency' : 
                      booking.status === 'confirmed' ? 'high' : 
                      booking.status === 'pending' ? 'medium' : 'low';
      
      events.push({
        id: booking.id,
        type: 'booking',
        startTime: '09:00',
        endTime: '17:00',
        title: `${booking.booking_type === 'emergency' ? 'Emergency' : 'Single Day'}${livingType}`,
        status: booking.status,
        client: clientName,
        location: fullAddress,
        familyInfo,
        homeSize,
        services,
        priority,
        isLongTerm: false
      });
    }
  });

  // Add interviews for the date with client info
  interviews.forEach(interview => {
    if (interview.interview_date && isSameDay(new Date(interview.interview_date), date)) {
      // Get client name from profiles join
      const clientProfile = interview.profiles as any;
      const clientName = clientProfile
        ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Potential Client'
        : 'Potential Client';
      
      events.push({
        id: interview.id,
        type: 'interview',
        startTime: interview.interview_time || '10:00',
        endTime: '11:00',
        title: `Interview with ${clientName}`,
        status: interview.status,
        client: clientName,
        location: interview.meeting_link ? 'Video Call' : 'TBD',
        priority: interview.status === 'scheduled' ? 'medium' : 'low'
      });
    }
  });

    // Add blocked time slots as events
    if (isDayBlocked(date)) {
      events.push({
        id: `blocked-${format(date, 'yyyy-MM-dd')}`,
        type: 'blocked',
        startTime: '00:00',
        title: 'Unavailable (Full Day)',
        status: 'blocked',
        priority: 'low'
      });
    }

    return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const todayEvents = getEventsForDate(new Date());

  // Calculate stats
  const thisWeekBookings = bookings.filter(booking => {
    if (!booking.start_date) return false;
    const bookingDate = new Date(booking.start_date);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return bookingDate >= weekStart && bookingDate <= weekEnd;
  }).length;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar & Availability</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your schedule and availability settings
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Today</CardTitle>
            <CalendarIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{todayEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayEvents.length === 0 ? 'No events' : `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Week</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{thisWeekBookings}</div>
            <p className="text-xs text-muted-foreground">
              Bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Days</CardTitle>
            <Settings className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              Per week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Hours</CardTitle>
            <Plus className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Calendar Interface */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <span className="text-lg md:text-xl">{format(selectedDate, 'MMMM yyyy')}</span>
            </div>
            <div className="flex gap-1 md:gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsScheduleBuilderOpen(true)}
                className="text-xs md:text-sm"
              >
                <Repeat className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Weekly </span>Schedule
              </Button>
              <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs md:text-sm">
                    <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Block
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Block Time</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Select Date</h3>
                    <Calendar
                      mode="single"
                      selected={blockDate}
                      onSelect={setBlockDate}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>
                  
                  {blockDate && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleBlockDay}
                          className="flex-1"
                          variant="destructive"
                          disabled={blockTime.isPending}
                        >
                          {blockTime.isPending ? 'Blocking...' : 'Block Entire Day'}
                        </Button>
                        <Button 
                          onClick={handleBlockHours}
                          className="flex-1"
                          disabled={selectedHours.length === 0 || blockTime.isPending}
                        >
                          {blockTime.isPending ? 'Blocking...' : `Block Selected Hours (${selectedHours.length})`}
                        </Button>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 text-sm md:text-base">Select hours to block:</h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2 max-h-60 overflow-y-auto">
                          {Array.from({ length: 18 }, (_, i) => {
                            const hour = i + 6;
                            const isSelected = selectedHours.includes(hour);
                            const isBlocked = isHourBlocked(blockDate, hour);
                            
                            return (
                              <Button
                                key={hour}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                disabled={isBlocked}
                                onClick={() => toggleHourSelection(hour)}
                                className={`text-xs ${isBlocked ? 'opacity-50' : ''} h-8 md:h-auto`}
                              >
                                {isBlocked && <X className="w-3 h-3 mr-1" />}
                                {hour.toString().padStart(2, '0')}:00
                              </Button>
                            );
                          })}
                        </div>
                        {selectedHours.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Selected: {selectedHours.map(h => `${h.toString().padStart(2, '0')}:00`).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex flex-col gap-4">
            {/* Main Calendar */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setIsDateDetailsOpen(true);
                }
              }}
              className="rounded-md border w-full"
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0,
                hasBooking: (date) => getEventsForDate(date).some(e => e.type === 'booking'),
                hasInterview: (date) => getEventsForDate(date).some(e => e.type === 'interview'),
                hasEmergency: (date) => getEventsForDate(date).some(e => e.priority === 'emergency'),
                isBlocked: (date) => isDayBlocked(date)
              }}
              modifiersStyles={{
                hasEvents: { fontWeight: 'bold' },
                hasBooking: { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' },
                hasInterview: { backgroundColor: 'hsl(var(--blue) / 0.1)', color: 'hsl(var(--blue))' },
                hasEmergency: { backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' },
                isBlocked: { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
              }}
            />
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {isToday(new Date()) ? 'Today' : format(new Date(), 'EEE, MMM d')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {todayEvents.length === 0 ? 'No events scheduled' : `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} scheduled`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayEvents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No events today</p>
                  </div>
                ) : (
                  todayEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="p-2 rounded-lg border space-y-1">
                      <div className="flex items-center gap-2">
                        {event.type === 'booking' ? (
                          <User className={`w-3 h-3 ${event.priority === 'emergency' ? 'text-red-600' : 'text-green-600'}`} />
                        ) : event.type === 'interview' ? (
                          <VideoIcon className="w-3 h-3 text-blue-600" />
                        ) : (
                          <X className="w-3 h-3 text-gray-600" />
                        )}
                        <span className="font-medium text-sm truncate">{event.title}</span>
                        <Badge variant={event.priority === 'emergency' ? 'destructive' : 'secondary'} className="text-xs ml-auto">
                          {event.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{event.startTime}</span>
                        {event.endTime && <span>- {event.endTime}</span>}
                      </div>
                    </div>
                  ))
                )}
                {todayEvents.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{todayEvents.length - 3} more events
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>


      {/* Date Details Dialog */}
      <Dialog open={isDateDetailsOpen} onOpenChange={setIsDateDetailsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No events scheduled for this day</p>
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <Card key={event.id} className="p-4">
                  <div className="space-y-3">
                    {/* Event Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {event.type === 'booking' ? (
                          <User className={`w-4 h-4 ${event.priority === 'emergency' ? 'text-red-600' : 'text-green-600'}`} />
                        ) : event.type === 'interview' ? (
                          <VideoIcon className="w-4 h-4 text-blue-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-600" />
                        )}
                        <div>
                          <h3 className="font-medium">{event.title}</h3>
                          {event.isLongTerm && event.bookingStartDate && event.bookingEndDate && (
                            <p className="text-xs text-muted-foreground">
                              {event.bookingStartDate} - {event.bookingEndDate}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={
                        event.priority === 'emergency' ? 'destructive' :
                        event.priority === 'high' ? 'default' :
                        event.priority === 'medium' ? 'secondary' : 'outline'
                      }>
                        {event.status}
                      </Badge>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-2 text-sm">
                      {event.type !== 'blocked' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {event.startTime}
                              {event.endTime && ` - ${event.endTime}`}
                            </span>
                          </div>
                          
                          {event.client && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{event.client}</span>
                            </div>
                          )}
                          
                          {event.location && event.location !== 'Client Home' && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>{event.location}</span>
                            </div>
                          )}

                          {event.familyInfo && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span>{event.familyInfo}</span>
                            </div>
                          )}

                          {event.services && event.services.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {event.services.map((service, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Weekly Schedule Builder Dialog */}
      <Dialog open={isScheduleBuilderOpen} onOpenChange={setIsScheduleBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Weekly Availability Schedule</DialogTitle>
          </DialogHeader>
          <WeeklyScheduleBuilder 
            onClose={() => setIsScheduleBuilderOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Availability Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3 md:space-y-4">
              <h3 className="font-medium text-sm md:text-base">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-10 md:h-auto"
                  onClick={() => setIsScheduleBuilderOpen(true)}
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  Set Weekly Schedule
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-10 md:h-auto"
                  onClick={() => setIsBlockDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Block Specific Days/Hours
                </Button>
              </div>
            </div>
            <div className="space-y-3 md:space-y-4">
              <h3 className="font-medium text-sm md:text-base">Current Settings</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Emergency bookings: Always Available</p>
                <p>Advance notice: {availability?.advance_notice_days || 7} days</p>
                <p>Blocked dates: {availability?.unavailable_dates?.length || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
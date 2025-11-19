import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Clock, User, VideoIcon, MapPin, Phone, Star, ChevronRight } from 'lucide-react';
import { format, isToday, isSameDay, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { useBookings } from '@/hooks/useBookings';
import { useInterviews } from '@/hooks/useInterviews';
import { useAuthContext } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CalendarEvent {
  id: string;
  type: 'booking' | 'interview';
  startTime: string;
  endTime?: string;
  title: string;
  status: string;
  nanny?: string;
  location?: string;
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  meetingLink?: string;
  nannyContact?: string;
  rating?: number;
  schedule?: any;
  livingArrangement?: string;
  services?: any;
  bookingType?: string;
}

export default function ClientCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const { user } = useAuthContext();
  const { data: bookings = [] } = useBookings();
  const { data: interviews = [] } = useInterviews();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log('ClientCalendar - User ID:', user?.id);
  console.log('ClientCalendar - Bookings count:', bookings.length);
  console.log('ClientCalendar - Interviews count:', interviews.length);

  // Realtime updates for bookings and interviews
  useEffect(() => {
    if (!user?.id) return;

    const bookingsChannel = supabase
      .channel('client-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `client_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Booking Created",
              description: "A new booking has been added to your calendar.",
            });
          } else if (payload.eventType === 'UPDATE' && payload.new.status === 'confirmed') {
            toast({
              title: "Booking Confirmed",
              description: "Your booking has been confirmed by the nanny.",
            });
          }
        }
      )
      .subscribe();

    const interviewsChannel = supabase
      .channel('client-interviews-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews',
          filter: `client_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Interview change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['interviews'] });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Interview Scheduled",
              description: "A new interview has been added to your calendar.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(interviewsChannel);
    };
  }, [user?.id, queryClient, toast]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    // Add bookings for the date - bookings are already filtered by useBookings hook
    bookings.forEach(booking => {
      
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = booking.end_date ? new Date(booking.end_date) : null;
      
      // For long-term bookings without end date, show them from start_date onwards (for next 6 months)
      const isWithinBookingPeriod = bookingEnd 
        ? (date >= bookingStart && date <= bookingEnd)
        : (booking.booking_type === 'long_term' && date >= bookingStart && date <= addDays(bookingStart, 180));
      
      if (isSameDay(bookingStart, date) || isWithinBookingPeriod) {
        
        const priority = booking.booking_type === 'emergency' ? 'emergency' : 
                        booking.status === 'confirmed' ? 'high' : 'medium';
        
        // ✅ P5: Extract nanny info from booking.nannies join
        const nannyProfile = (booking as any).nannies?.profiles;
        const nannyName = nannyProfile 
          ? `${nannyProfile.first_name || ''} ${nannyProfile.last_name || ''}`.trim() || 'Your Nanny'
          : 'Your Nanny';
        const nannyPhone = nannyProfile?.phone || '';
        const nannyRating = (booking as any).nannies?.rating || 0;
        const clientLocation = 'Your Home';
        const livingArrangement = booking.living_arrangement ? 
          ` (${booking.living_arrangement === 'live-in' ? 'Live-in' : 'Live-out'})` : '';
        
        events.push({
          id: booking.id,
          type: 'booking',
          startTime: '09:00',
          endTime: '17:00',
          title: `Childcare Session${livingArrangement}`,
          status: booking.status,
          nanny: nannyName,
          location: clientLocation,
          priority: priority as 'low' | 'medium' | 'high' | 'emergency',
          nannyContact: nannyPhone,
          rating: nannyRating,
          schedule: booking.schedule,
          livingArrangement: booking.living_arrangement,
          services: booking.services,
          bookingType: booking.booking_type
        });
      }
    });

    // Add interviews for the date - interviews are already filtered by useInterviews hook
    interviews.forEach(interview => {
      
      if (interview.interview_date && isSameDay(new Date(interview.interview_date), date)) {
        // Extract nanny name from interview
        const nannyName = interview.nanny_name || 'Potential Nanny';
        
        events.push({
          id: interview.id,
          type: 'interview',
          startTime: interview.interview_time || '10:00',
          endTime: interview.interview_time ? 
            format(new Date(`2000-01-01 ${interview.interview_time}`).getTime() + 60 * 60 * 1000, 'HH:mm') : 
            '11:00',
          title: `Interview with ${nannyName}`,
          status: interview.status,
          nanny: nannyName,
          location: interview.meeting_link ? 'Video Call' : 'Your Location',
          priority: 'medium',
          meetingLink: interview.meeting_link || undefined,
          nannyContact: '',
          rating: 0
        });
      }
    });

    return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const todayEvents = getEventsForDate(new Date());

  // Calculate upcoming events
  const upcomingEvents = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(new Date(), i);
    const dayEvents = getEventsForDate(date);
    upcomingEvents.push(...dayEvents.map(event => ({ ...event, date })));
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Calendar</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          View your scheduled interviews and childcare sessions
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
              {todayEvents.length === 0 ? 'No events' : `Event${todayEvents.length > 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">This Week</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Interviews</CardTitle>
            <VideoIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {upcomingEvents.filter(e => e.type === 'interview').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Bookings</CardTitle>
            <User className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {upcomingEvents.filter(e => e.type === 'booking').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">{format(selectedDate, 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                }
              }}
              className="rounded-md border w-full"
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0,
                hasInterview: (date) => getEventsForDate(date).some(e => e.type === 'interview'),
                hasBooking: (date) => getEventsForDate(date).some(e => e.type === 'booking'),
                hasEmergency: (date) => getEventsForDate(date).some(e => e.priority === 'emergency')
              }}
              modifiersStyles={{
                hasEvents: { fontWeight: 'bold' },
                hasInterview: { backgroundColor: 'hsl(var(--blue) / 0.1)', color: 'hsl(var(--blue))' },
                hasBooking: { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' },
                hasEmergency: { backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDateEvents.length === 0 ? 'No events scheduled' : `${selectedDateEvents.length} event${selectedDateEvents.length > 1 ? 's' : ''}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events scheduled for this day</p>
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="p-3 rounded-lg border space-y-2 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {event.type === 'booking' ? (
                        <User className={`w-4 h-4 ${event.priority === 'emergency' ? 'text-red-600' : 'text-green-600'}`} />
                      ) : (
                        <VideoIcon className="w-4 h-4 text-blue-600" />
                      )}
                      <div>
                        <span className="font-medium text-sm">{event.title}</span>
                        <p className="text-xs text-muted-foreground">
                          {event.startTime} - {event.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          event.priority === 'emergency' ? 'destructive' : 
                          event.status === 'confirmed' ? 'default' : 'secondary'
                        } 
                        className="text-xs"
                      >
                        {event.status}
                      </Badge>
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </div>
                    {event.rating && event.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{event.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.type === 'booking' ? (
                <User className="w-5 h-5 text-green-600" />
              ) : (
                <VideoIcon className="w-5 h-5 text-blue-600" />
              )}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge 
                    variant={
                      selectedEvent.priority === 'emergency' ? 'destructive' : 
                      selectedEvent.status === 'confirmed' ? 'default' : 'secondary'
                    }
                  >
                    {selectedEvent.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time</span>
                  <span className="text-sm font-medium">
                    {selectedEvent.startTime} - {selectedEvent.endTime}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">With</span>
                  <span className="text-sm font-medium">{selectedEvent.nanny}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <span className="text-sm font-medium">{selectedEvent.location}</span>
                </div>
                
                {selectedEvent.rating && selectedEvent.rating > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{selectedEvent.rating.toFixed(1)}</span>
                    </div>
                  </div>
                )}
                
                {selectedEvent.bookingType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm font-medium capitalize">{selectedEvent.bookingType.replace('_', ' ')}</span>
                  </div>
                )}
                
                {selectedEvent.livingArrangement && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Arrangement</span>
                    <span className="text-sm font-medium">
                      {selectedEvent.livingArrangement === 'live-in' ? 'Live-in' : 'Live-out'}
                    </span>
                  </div>
                )}
                
                {selectedEvent.schedule && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground block mb-2">Schedule</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedEvent.schedule).map(([day, isActive]) => 
                        isActive ? (
                          <Badge key={day} variant="secondary" className="text-xs capitalize">
                            {day.slice(0, 3)}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
                
                {selectedEvent.services && Object.keys(selectedEvent.services).length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground block mb-2">Services</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedEvent.services).map(([service, included]) => 
                        included ? (
                          <Badge key={service} variant="outline" className="text-xs capitalize">
                            {service.replace(/_/g, ' ')}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {selectedEvent.meetingLink && (
                  <Button 
                    className="w-full" 
                    onClick={() => window.open(selectedEvent.meetingLink, '_blank')}
                  >
                    <VideoIcon className="w-4 h-4 mr-2" />
                    Join Video Call
                  </Button>
                )}
                
                {selectedEvent.nannyContact && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(`tel:${selectedEvent.nannyContact}`, '_self')}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call {selectedEvent.nanny}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
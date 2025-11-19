import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, MapPin, User, Users, Home, Baby } from 'lucide-react';
import { format, isSameDay, isAfter, isBefore } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getHomeSizeDisplayName } from '@/utils/homeSizeDisplay';

interface BookingEvent {
  id: string;
  bookingType: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  nannyName: string;
  clientName: string;
  fullAddress: string;
  familyInfo: string;
  homeSize: string;
  services: string[];
  priority: 'low' | 'medium' | 'high' | 'emergency';
}

export default function AdminBookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedNanny, setSelectedNanny] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch all bookings with comprehensive data
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-calendar-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          nannies!inner(
            id,
            profiles!inner(first_name, last_name)
          ),
          clients!inner(
            id,
            home_size,
            number_of_children,
            children_ages,
            other_dependents,
            pets_in_home,
            profiles!inner(
              first_name,
              last_name,
              location,
              phone,
              email
            )
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
        .in('status', ['pending', 'confirmed', 'active', 'completed'])
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch unique nannies for filter
  const { data: nannies = [] } = useQuery({
    queryKey: ['admin-calendar-nannies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nannies')
        .select('id, profiles!inner(first_name, last_name)')
        .eq('approval_status', 'approved');
      
      if (error) throw error;
      return data;
    }
  });

  // Process bookings into events
  const processedEvents: BookingEvent[] = bookings.map(booking => {
    const nannyProfile = (booking.nannies as any)?.profiles;
    const clientData = (booking.clients as any);
    const clientProfile = clientData?.profiles;
    const preferences = (booking.client_preferences as any);

    // Extract full address
    const clientLocation = clientProfile?.location;
    const fullAddress = clientLocation 
      ? (() => {
          try {
            const loc = typeof clientLocation === 'string' ? JSON.parse(clientLocation) : clientLocation;
            const parts = [];
            if (loc.street?.trim()) parts.push(loc.street.trim());
            if (loc.suburb?.trim()) parts.push(loc.suburb.trim());
            if (loc.city?.trim()) parts.push(loc.city.trim());
            return parts.join(', ') || 'Address not provided';
          } catch {
            return 'Address not provided';
          }
        })()
      : 'Address not provided';

    // Extract family info
    const familyInfo = clientData 
      ? `${clientData.number_of_children || 0} ${clientData.number_of_children === 1 ? 'child' : 'children'}${
          (clientData.children_ages || []).length > 0 ? ` (ages ${(clientData.children_ages || []).join(', ')})` : ''
        }`
      : 'Not specified';

    // Extract services
    const services = [];
    if (preferences?.cooking) services.push('Cooking');
    if (preferences?.light_house_keeping) services.push('Light Housekeeping');
    if (preferences?.driving_support) services.push('Driving');
    if (preferences?.special_needs) services.push('Diverse Ability Support');
    if (preferences?.ecd_training) services.push('ECD Training');
    if (preferences?.montessori) services.push('Montessori');
    if (preferences?.pet_care) services.push('Pet Care');
    if (preferences?.errand_runs) services.push('Errands');

    const priority = booking.booking_type === 'emergency' ? 'emergency' : 
                    booking.status === 'confirmed' ? 'high' : 
                    booking.status === 'pending' ? 'medium' : 'low';

    return {
      id: booking.id,
      bookingType: booking.booking_type,
      status: booking.status,
      startDate: new Date(booking.start_date),
      endDate: booking.end_date ? new Date(booking.end_date) : null,
      nannyName: nannyProfile ? `${nannyProfile.first_name} ${nannyProfile.last_name}` : 'Nanny',
      clientName: clientProfile ? `${clientProfile.first_name} ${clientProfile.last_name}` : 'Client',
      fullAddress,
      familyInfo,
      homeSize: clientData?.home_size || '',
      services,
      priority
    };
  });

  // Filter events for selected date
  const getEventsForDate = (date: Date): BookingEvent[] => {
    return processedEvents.filter(event => {
      // Filter by nanny
      if (selectedNanny !== 'all') {
        const matchingBooking = bookings.find(b => b.id === event.id);
        if (matchingBooking && matchingBooking.nanny_id !== selectedNanny) {
          return false;
        }
      }

      // Filter by status
      if (selectedStatus !== 'all' && event.status !== selectedStatus) {
        return false;
      }

      // Check if event falls on the selected date
      if (event.endDate && isAfter(event.endDate, event.startDate)) {
        return isSameDay(event.startDate, date) || 
               (isAfter(date, event.startDate) && isBefore(date, event.endDate)) || 
               isSameDay(event.endDate, date);
      } else {
        return isSameDay(event.startDate, date);
      }
    });
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'active': return 'default';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Booking Calendar</h2>
        <p className="text-muted-foreground">
          View all bookings with client details and service requirements
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedNanny} onValueChange={setSelectedNanny}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by nanny" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Nannies</SelectItem>
            {nannies.map((nanny: any) => (
              <SelectItem key={nanny.id} value={nanny.id}>
                {nanny.profiles?.first_name} {nanny.profiles?.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium">Selected: {format(selectedDate, 'MMMM d, yyyy')}</p>
              <p>{selectedDateEvents.length} booking(s) on this date</p>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Bookings on {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading bookings...
              </div>
            ) : selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bookings on this date
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <Card key={event.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(event.priority)}>
                            {event.bookingType}
                          </Badge>
                          <Badge variant={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(event.startDate, 'MMM d, yyyy')}
                          {event.endDate && ` - ${format(event.endDate, 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>

                    {/* Nanny & Client */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Nanny</p>
                          <p className="text-sm font-medium">{event.nannyName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Client</p>
                          <p className="text-sm font-medium">{event.clientName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    {event.fullAddress && event.fullAddress !== 'Address not provided' && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{event.fullAddress}</p>
                      </div>
                    )}

                    {/* Family Info */}
                    {event.familyInfo && (
                      <div className="flex items-center gap-2">
                        <Baby className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{event.familyInfo}</p>
                      </div>
                    )}

                    {/* Home Size */}
                    {event.homeSize && (
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{getHomeSizeDisplayName(event.homeSize)}</p>
                      </div>
                    )}

                    {/* Services */}
                    {event.services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.services.map((service, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

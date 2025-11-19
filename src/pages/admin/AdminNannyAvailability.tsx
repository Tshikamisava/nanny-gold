import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface NannyAvailabilityOverview {
  id: string;
  first_name: string;
  last_name: string;
  approval_status: string;
  is_available: boolean;
  availability_data: {
    available_dates: string[];
    unavailable_dates: string[];
    recurring_schedule: any;
    emergency_available: boolean;
    advance_notice_days: number;
  };
  upcoming_bookings: number;
  current_week_bookings: number;
}

export default function AdminNannyAvailability() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedNanny, setSelectedNanny] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  // Fetch all nannies with their availability data
  const { data: nanniesAvailability = [], isLoading } = useQuery({
    queryKey: ['admin-nannies-availability', format(selectedDate, 'yyyy-MM')],
    queryFn: async () => {
      // Get all nannies with their profiles
      const { data: nannies, error: nanniesError } = await supabase
        .from('nannies')
        .select(`
          id,
          approval_status,
          is_available,
          profiles!inner (
            first_name,
            last_name
          )
        `)
        .eq('approval_status', 'approved');

      if (nanniesError) throw nanniesError;

      // Get availability data for each nanny
      const availabilityPromises = nannies.map(async (nanny) => {
        const { data: availability } = await supabase
          .from('nanny_availability')
          .select('*')
          .eq('nanny_id', nanny.id)
          .single();

        // Get booking counts
        const { count: upcomingBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('nanny_id', nanny.id)
          .eq('status', 'confirmed')
          .gte('start_date', format(new Date(), 'yyyy-MM-dd'));

        const weekStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
        const weekEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
        
        const { count: currentWeekBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('nanny_id', nanny.id)
          .gte('start_date', weekStart)
          .lte('start_date', weekEnd);

        return {
          id: nanny.id,
          first_name: nanny.profiles.first_name,
          last_name: nanny.profiles.last_name,
          approval_status: nanny.approval_status,
          is_available: nanny.is_available,
          availability_data: availability || {
            available_dates: [],
            unavailable_dates: [],
            recurring_schedule: {},
            emergency_available: false,
            advance_notice_days: 7
          },
          upcoming_bookings: upcomingBookings || 0,
          current_week_bookings: currentWeekBookings || 0
        };
      });

      return Promise.all(availabilityPromises);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter nannies based on selection
  const filteredNannies = selectedNanny === 'all' 
    ? nanniesAvailability 
    : nanniesAvailability.filter(nanny => nanny.id === selectedNanny);

  // Calculate summary stats
  const stats = {
    totalNannies: nanniesAvailability.length,
    availableNannies: nanniesAvailability.filter(n => n.is_available).length,
    emergencyAvailable: nanniesAvailability.filter(n => n.availability_data.emergency_available).length,
    fullyBooked: nanniesAvailability.filter(n => n.current_week_bookings > 0).length
  };

  // Check if a specific date is blocked for any nanny
  const getNanniesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredNannies.filter(nanny => {
      const unavailable = nanny.availability_data.unavailable_dates || [];
      return !unavailable.includes(dateStr) && nanny.is_available;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nanny Availability Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and manage nanny availability across your platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            onClick={() => setViewMode('overview')}
          >
            <Users className="w-4 h-4 mr-1" />
            Overview
          </Button>
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            onClick={() => setViewMode('detailed')}
          >
            <CalendarDays className="w-4 h-4 mr-1" />
            Detailed
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nannies</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNannies}</div>
            <p className="text-xs text-muted-foreground">
              Approved & active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableNannies}</div>
            <p className="text-xs text-muted-foreground">
              Ready for bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Available</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emergencyAvailable}</div>
            <p className="text-xs text-muted-foreground">
              Can take urgent bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fullyBooked}</div>
            <p className="text-xs text-muted-foreground">
              Have bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedNanny} onValueChange={setSelectedNanny}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select nanny" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Nannies</SelectItem>
            {nanniesAvailability.map((nanny) => (
              <SelectItem key={nanny.id} value={nanny.id}>
                {nanny.first_name} {nanny.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewMode === 'overview' ? (
        /* Overview Mode */
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  available: (date) => getNanniesForDate(date).length > 0,
                  unavailable: (date) => getNanniesForDate(date).length === 0
                }}
                modifiersStyles={{
                  available: { backgroundColor: 'hsl(var(--primary) / 0.1)' },
                  unavailable: { backgroundColor: 'hsl(var(--destructive) / 0.1)' }
                }}
              />
              
              {/* Selected Date Info */}
              <div className="mt-4 p-3 border rounded-lg">
                <h4 className="font-medium mb-2">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {getNanniesForDate(selectedDate).length} nannies available
                </p>
                <div className="space-y-1">
                  {getNanniesForDate(selectedDate).slice(0, 3).map((nanny) => (
                    <div key={nanny.id} className="flex items-center gap-2 text-sm">
                      <Badge 
                        variant={nanny.availability_data.emergency_available ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {nanny.first_name} {nanny.last_name}
                      </Badge>
                      {nanny.availability_data.emergency_available && (
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                      )}
                    </div>
                  ))}
                  {getNanniesForDate(selectedDate).length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{getNanniesForDate(selectedDate).length - 3} more
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nannies List */}
          <Card>
            <CardHeader>
              <CardTitle>Nanny Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredNannies.map((nanny) => (
                  <div key={nanny.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {nanny.first_name} {nanny.last_name}
                        </span>
                        <div className="flex gap-2 mt-1">
                          <Badge 
                            variant={nanny.is_available ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {nanny.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                          {nanny.availability_data.emergency_available && (
                            <Badge variant="outline" className="text-xs">
                              Emergency
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{nanny.upcoming_bookings} upcoming bookings</p>
                      <p>{nanny.availability_data.unavailable_dates?.length || 0} blocked days</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Detailed Mode */
        <Card>
          <CardHeader>
            <CardTitle>Detailed Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredNannies.map((nanny) => (
                <div key={nanny.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-lg">
                      {nanny.first_name} {nanny.last_name}
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant={nanny.is_available ? 'default' : 'secondary'}>
                        {nanny.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                      {nanny.availability_data.emergency_available && (
                        <Badge variant="outline">Emergency Ready</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Blocked Dates</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {nanny.availability_data.unavailable_dates?.length > 0 ? (
                          nanny.availability_data.unavailable_dates.map((date) => (
                            <div key={date} className="flex items-center gap-2 text-sm">
                              <X className="w-3 h-3 text-red-500" />
                              {format(new Date(date), 'MMM d, yyyy')}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No blocked dates</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Settings</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Advance notice: {nanny.availability_data.advance_notice_days} days</p>
                        <p>Upcoming bookings: {nanny.upcoming_bookings}</p>
                        <p>This month: {nanny.current_week_bookings} bookings</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
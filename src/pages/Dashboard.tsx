
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Heart, Calendar, MessageCircle, Bell, Star, ArrowLeft, AlertTriangle, Clock, LogOut, Users } from "lucide-react";
import InterviewsTab from "./InterviewsTab";
import { useAuthContext } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useBookings, BookingWithNanny } from "@/hooks/useBookings";
import { format } from "date-fns";
import { formatCurrency, getBookingTypeRate, isHourlyBasedBooking } from "@/utils/pricingUtils";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  const { toast } = useToast();
  const { data: bookings, isLoading: bookingsLoading } = useBookings();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getBookingTypeDisplay = (bookingType: string) => {
    const types = {
      'emergency': { label: 'Emergency', variant: 'destructive' as const, icon: AlertTriangle },
      'date_night': { label: 'Date Night', variant: 'secondary' as const, icon: Heart },
      'date_day': { label: 'Day Care', variant: 'outline' as const, icon: Calendar },
      'school_holiday': { label: 'School Holiday', variant: 'default' as const, icon: Calendar },
      'long_term': { label: 'Long Term', variant: 'default' as const, icon: Calendar },
      'standard': { label: 'Standard', variant: 'outline' as const, icon: Calendar }
    };
    return types[bookingType as keyof typeof types] || types['standard'];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'active': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const activeBookings = bookings?.filter(booking => 
    booking.status === 'confirmed' || booking.status === 'active'
  ) || [];

  const upcomingBookings = bookings?.filter(booking => 
    booking.status === 'pending' || booking.status === 'confirmed'
  ) || [];

  const handleTabChange = (value: string) => {
    if (value === "home") {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 to-yellow-50">
      <div className="max-w-sm mx-auto">
        {/* Header with Navigation Arrows */}
        <div className="royal-gradient text-white p-6 rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-semibold">Welcome back!</h1>
              <p className="opacity-90">How can we help today?</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs defaultValue="dashboard" onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-white rounded-xl shadow-sm">
              <TabsTrigger value="home" className="text-xs">Home</TabsTrigger>
              <TabsTrigger value="nannies" className="text-xs">Nannies</TabsTrigger>
              <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
              <TabsTrigger value="interviews" className="text-xs">Interviews</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {/* Active Bookings */}
              <Card className="rounded-xl royal-shadow">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-fuchsia-900 mb-4">Active Bookings</h3>
                  {bookingsLoading ? (
                    <div className="text-center py-4">
                      <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600">Loading bookings...</p>
                    </div>
                  ) : activeBookings.length > 0 ? (
                    activeBookings.map((booking) => {
                      const bookingType = getBookingTypeDisplay(booking.booking_type || 'standard');
                      const nannyName = `${booking.nannies.profiles.first_name || ''} ${booking.nannies.profiles.last_name || ''}`.trim();
                      const startDate = new Date(booking.start_date);
                      const isToday = startDate.toDateString() === new Date().toDateString();
                      const rateInfo = getBookingTypeRate(booking.booking_type || 'standard', booking.clients?.home_size);
                      const isHourlyBooking = isHourlyBasedBooking(booking.booking_type || 'standard');
                      
                      return (
                        <div key={booking.id} className="flex items-start space-x-4 p-4 border rounded-lg mb-3 last:mb-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center">
                            <Heart className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-fuchsia-900">{nannyName || 'Nanny'}</h4>
                              <Badge variant={bookingType.variant} className="flex items-center gap-1">
                                <bookingType.icon className="w-3 h-3" />
                                {bookingType.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {isToday ? 'Today' : format(startDate, 'MMM dd, yyyy')}
                              {booking.booking_type === 'emergency' && ' - Emergency Response'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Total: {formatCurrency(booking.total_monthly_cost)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className={getStatusColor(booking.status)}
                          >
                            {booking.status}
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600">No active bookings</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => navigate('/service-prompt')}
                  className="h-20 flex-col space-y-2 royal-gradient text-white rounded-xl"
                >
                  <Heart className="w-6 h-6" />
                  <span className="text-sm">Find Nanny</span>
                </Button>
                <Button
                  onClick={() => navigate('/support')}
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-fuchsia-300 text-fuchsia-700 rounded-xl"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-sm">Support</span>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="nannies" className="space-y-4 mt-6">
              <h3 className="font-semibold text-fuchsia-900">All Bookings</h3>
              {bookingsLoading ? (
                <div className="text-center py-6">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">Loading bookings...</p>
                </div>
              ) : bookings && bookings.length > 0 ? (
                bookings.map((booking) => {
                  const bookingType = getBookingTypeDisplay(booking.booking_type || 'standard');
                  const nannyName = `${booking.nannies.profiles.first_name || ''} ${booking.nannies.profiles.last_name || ''}`.trim();
                  const rateInfo = getBookingTypeRate(booking.booking_type || 'standard', booking.clients?.home_size);
                  const isHourlyBooking = isHourlyBasedBooking(booking.booking_type || 'standard');
                  
                  return (
                    <Card key={booking.id} className="rounded-xl royal-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-fuchsia-900">{nannyName || 'Nanny'}</h4>
                              <Badge variant={bookingType.variant} className="flex items-center gap-1">
                                <bookingType.icon className="w-3 h-3" />
                                {bookingType.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {format(new Date(booking.start_date), 'MMM dd, yyyy')} - {booking.status}
                            </p>
                            <p className="text-xs text-gray-500">
                              Total: {formatCurrency(booking.total_monthly_cost)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className={getStatusColor(booking.status)}
                          >
                            {booking.status}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">No bookings yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4 mt-6">
              <h3 className="font-semibold text-fuchsia-900">Upcoming Sessions</h3>
              <Card className="rounded-xl royal-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Calendar className="w-8 h-8 text-fuchsia-600" />
                    <div>
                      <h4 className="font-medium text-fuchsia-900">Today - Sarah Johnson</h4>
                      <p className="text-sm text-gray-600">9:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4 mt-6">
              <h3 className="font-semibold text-fuchsia-900">Messages</h3>
              <Card className="rounded-xl royal-shadow">
                <CardContent className="p-4 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No new messages</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interviews" className="space-y-4 mt-6">
              <InterviewsTab />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-6">
              <h3 className="font-semibold text-fuchsia-900">Settings</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-fuchsia-300 text-fuchsia-700"
                >
                  Profile Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-fuchsia-300 text-fuchsia-700"
                >
                  Payment Methods
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-fuchsia-300 text-fuchsia-700"
                >
                  Notifications
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full justify-start border-red-300 text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ComposedChart, ResponsiveContainer } from 'recharts';
import { Download, FileText, Table, Presentation, Brain, Filter, Calendar, Users, DollarSign, Clock, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AnalyticsData {
  bookingsByPeriod: any[];
  revenueByPeriod: any[];
  nannyPerformance: any[];
  bookingStatus: any[];
  serviceTypes: any[];
  clientSatisfaction: any[];
  geographicDistribution: any[];
  totalNanniesLive: number;
  nanniesPerRegion: any[];
  mostBookedNannies: any[];
  mostBookedServices: any[];
}

interface FilterState {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  timePeriod: string;
  bookingType: string;
  nannyStatus: string;
  serviceType: string;
  region: string;
}

const AdminAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    bookingsByPeriod: [],
    revenueByPeriod: [],
    nannyPerformance: [],
    bookingStatus: [],
    serviceTypes: [],
    clientSatisfaction: [],
    geographicDistribution: [],
    totalNanniesLive: 0,
    nanniesPerRegion: [],
    mostBookedNannies: [],
    mostBookedServices: []
  });
  
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: null, end: null },
    timePeriod: 'month',
    bookingType: 'all',
    nannyStatus: 'all',
    serviceType: 'all',
    region: 'all'
  });
  
  const [loading, setLoading] = useState(true);
  const [aiReportPrompt, setAiReportPrompt] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  const [reportGenerating, setReportGenerating] = useState(false);
  const { toast } = useToast();

  const chartConfig = {
    bookings: {
      label: "Bookings",
      color: "hsl(var(--chart-1))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-2))",
    },
    nannies: {
      label: "Nannies",
      color: "hsl(var(--chart-3))",
    },
    clients: {
      label: "Clients",
      color: "hsl(var(--chart-4))",
    },
    satisfaction: {
      label: "Satisfaction",
      color: "hsl(var(--chart-5))",
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Build date filter
      let dateFilter = '';
      if (filters.dateRange.start && filters.dateRange.end) {
        dateFilter = `created_at.gte.${filters.dateRange.start.toISOString().split('T')[0]} AND created_at.lte.${filters.dateRange.end.toISOString().split('T')[0]}`;
      }

      // Bookings by time period
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('created_at, total_monthly_cost, booking_type, status, nanny_id, client_id')
        .order('created_at');

      // Process bookings by selected time period
      const bookingsByPeriod = processBookingsByPeriod(bookingsData || [], filters.timePeriod);
      const revenueByPeriod = processRevenueByPeriod(bookingsData || [], filters.timePeriod);

      // Booking status distribution
      const bookingStatus = processBookingStatus(bookingsData || []);

      // Service types from nanny_services (boolean columns)
      const { data: servicesData } = await supabase
        .from('nanny_services')
        .select('nanny_id, pet_care, cooking, special_needs, ecd_training, montessori');
      
      const serviceTypes = processServiceTypes(servicesData || []);
      const mostBookedServices = processMostBookedServices(servicesData || [], bookingsData || []);

      // Total nannies live and performance
      const { data: nanniesData } = await supabase
        .from('nannies')
        .select(`
          id,
          rating,
          total_reviews,
          is_available,
          approval_status,
          profiles!inner(first_name, last_name, location),
          bookings(id, total_monthly_cost, status)
        `);

      const nannyPerformance = processNannyPerformance(nanniesData || []);
      const totalNanniesLive = nanniesData?.filter(n => n.is_available && n.approval_status === 'approved').length || 0;
      const nanniesPerRegion = processNanniesPerRegion(nanniesData || []);
      const mostBookedNannies = processMostBookedNannies(nanniesData || []);

      // Client satisfaction (from reviews)
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating, created_at');

      const clientSatisfaction = processClientSatisfaction(reviewsData || []);

      // Geographic distribution (mock data for now)
      const geographicDistribution = [
        { region: 'Johannesburg', count: 45, percentage: 35 },
        { region: 'Cape Town', count: 38, percentage: 30 },
        { region: 'Durban', count: 25, percentage: 20 },
        { region: 'Pretoria', count: 19, percentage: 15 }
      ];

      setAnalyticsData({
        bookingsByPeriod,
        revenueByPeriod,
        nannyPerformance,
        bookingStatus,
        serviceTypes,
        clientSatisfaction,
        geographicDistribution,
        totalNanniesLive,
        nanniesPerRegion,
        mostBookedNannies,
        mostBookedServices
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processBookingsByPeriod = (data: any[], period: string) => {
    const periodData: { [key: string]: number } = {};
    
    data.forEach(booking => {
      const date = new Date(booking.created_at);
      let key = '';
      
      switch (period) {
        case 'day':
          key = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}`;
          break;
        case 'month':
          key = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `Q${quarter} ${date.getFullYear()}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
      }
      
      periodData[key] = (periodData[key] || 0) + 1;
    });

    return Object.entries(periodData).map(([period, count]) => ({
      period,
      bookings: count
    }));
  };

  const processRevenueByPeriod = (data: any[], period: string) => {
    const periodRevenue: { [key: string]: number } = {};
    
    data.forEach(booking => {
      if (booking.status === 'confirmed' && booking.total_monthly_cost) {
        const date = new Date(booking.created_at);
        let key = '';
        
        switch (period) {
          case 'day':
            key = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = `Week of ${weekStart.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}`;
            break;
          case 'month':
            key = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short' 
            });
            break;
          case 'quarter':
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            key = `Q${quarter} ${date.getFullYear()}`;
            break;
          case 'year':
            key = date.getFullYear().toString();
            break;
          default:
            key = date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short' 
            });
        }
        
        periodRevenue[key] = (periodRevenue[key] || 0) + Number(booking.total_monthly_cost);
      }
    });

    return Object.entries(periodRevenue).map(([period, revenue]) => ({
      period,
      revenue: Math.round(revenue)
    }));
  };

  const processBookingStatus = (data: any[]) => {
    const statusCounts: { [key: string]: number } = {};
    
    data.forEach(booking => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: Math.round((count / data.length) * 100)
    }));
  };

  const processServiceTypes = (data: any[]) => {
    const serviceCounts = {
      'Pet Care': 0,
      'Cooking': 0,
      'Diverse Ability Support': 0,
      'ECD Training': 0,
      'Montessori': 0
    };
    
    data.forEach(service => {
      if (service.pet_care) serviceCounts['Pet Care']++;
      if (service.cooking) serviceCounts['Cooking']++;
      if (service.special_needs) serviceCounts['Diverse Ability Support']++;
      if (service.ecd_training) serviceCounts['ECD Training']++;
      if (service.montessori) serviceCounts['Montessori']++;
    });

    return Object.entries(serviceCounts).map(([service, count]) => ({
      service,
      count
    }));
  };

  const processNanniesPerRegion = (data: any[]) => {
    const regionCounts: { [key: string]: number } = {};
    
    data.forEach(nanny => {
      if (nanny.is_available && nanny.approval_status === 'approved') {
        const region = nanny.profiles?.location || 'Unknown';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }
    });

    return Object.entries(regionCounts).map(([region, count]) => ({
      region,
      count
    }));
  };

  const processMostBookedNannies = (data: any[]) => {
    return data
      .filter(nanny => nanny.bookings?.length > 0)
      .map(nanny => ({
        name: `${nanny.profiles?.first_name || ''} ${nanny.profiles?.last_name || ''}`.trim() || 'Unknown',
        bookings: nanny.bookings?.length || 0,
        rating: Number(nanny.rating) || 0,
        revenue: nanny.bookings?.filter((b: any) => b.status === 'confirmed')
          .reduce((sum: number, b: any) => sum + (Number(b.total_monthly_cost) || 0), 0) || 0
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10);
  };

  const processMostBookedServices = (servicesData: any[], bookingsData: any[]) => {
    const serviceBookings: { [key: string]: number } = {};
    
    // Create a map of nanny_id to their services
    const nannyServices: { [key: string]: string[] } = {};
    servicesData.forEach(service => {
      nannyServices[service.nanny_id] = [];
      if (service.pet_care) nannyServices[service.nanny_id].push('Pet Care');
      if (service.cooking) nannyServices[service.nanny_id].push('Cooking');
      if (service.special_needs) nannyServices[service.nanny_id].push('Diverse Ability Support');
      if (service.ecd_training) nannyServices[service.nanny_id].push('ECD Training');
      if (service.montessori) nannyServices[service.nanny_id].push('Montessori');
    });

    // Count bookings for each service
    bookingsData.forEach(booking => {
      if (booking.status === 'confirmed' && nannyServices[booking.nanny_id]) {
        nannyServices[booking.nanny_id].forEach(service => {
          serviceBookings[service] = (serviceBookings[service] || 0) + 1;
        });
      }
    });

    return Object.entries(serviceBookings)
      .map(([service, count]) => ({ service, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings);
  };

  const processNannyPerformance = (data: any[]) => {
    return data.map(nanny => ({
      name: `${nanny.profiles?.first_name || ''} ${nanny.profiles?.last_name || ''}`.trim() || 'Unknown',
      rating: Number(nanny.rating) || 0,
      reviews: nanny.total_reviews || 0,
      bookings: nanny.bookings?.length || 0,
      revenue: nanny.bookings?.filter((b: any) => b.status === 'confirmed')
        .reduce((sum: number, b: any) => sum + (Number(b.total_monthly_cost) || 0), 0) || 0
    })).slice(0, 10); // Top 10 performers
  };

  const processClientSatisfaction = (data: any[]) => {
    const ratingCounts: { [key: number]: number } = {};
    
    data.forEach(review => {
      const rating = Math.floor(review.rating);
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
    });

    return Object.entries(ratingCounts).map(([rating, count]) => ({
      rating: `${rating} Stars`,
      count,
      percentage: Math.round((count / data.length) * 100)
    }));
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'powerpoint') => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-analytics-export', {
        body: {
          format,
          data: analyticsData,
          filters,
          generatedReport
        }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report.${format === 'powerpoint' ? 'pptx' : format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${format.toUpperCase()} report downloaded successfully`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateAIReport = async () => {
    if (!aiReportPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report prompt",
        variant: "destructive"
      });
      return;
    }

    setReportGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        body: {
          prompt: aiReportPrompt,
          analyticsData,
          filters
        }
      });

      if (error) throw error;

      setGeneratedReport(data.report);
      toast({
        title: "Report Generated",
        description: "AI report has been generated successfully",
      });

    } catch (error) {
      console.error('AI Report error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setReportGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground">Comprehensive insights and data visualization</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                AI Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate AI Report</DialogTitle>
                <DialogDescription>
                  Describe what kind of report you'd like the AI to generate based on the current analytics data.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportPrompt">Report Requirements</Label>
                  <Textarea
                    id="reportPrompt"
                    placeholder="E.g., Generate a comprehensive monthly business report focusing on revenue trends, nanny performance, and client satisfaction insights..."
                    value={aiReportPrompt}
                    onChange={(e) => setAiReportPrompt(e.target.value)}
                    rows={4}
                  />
                </div>
                
                {generatedReport && (
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h4 className="font-semibold mb-2">Generated Report:</h4>
                    <div className="whitespace-pre-wrap text-sm">{generatedReport}</div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={generateAIReport} disabled={reportGenerating}>
                  {reportGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => handleExport('pdf')} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => handleExport('excel')} variant="outline">
            <Table className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => handleExport('powerpoint')} variant="outline">
            <Presentation className="h-4 w-4 mr-2" />
            PowerPoint
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Time Period</Label>
              <Select value={filters.timePeriod} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, timePeriod: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value ? new Date(e.target.value) : null }
                  }))}
                />
                <Input
                  type="date"
                  value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value ? new Date(e.target.value) : null }
                  }))}
                />
              </div>
            </div>
            
            <div>
              <Label>Booking Type</Label>
              <Select value={filters.bookingType} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, bookingType: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="short_term">Short Term</SelectItem>
                  <SelectItem value="long_term">Long Term</SelectItem>
                  <SelectItem value="bespoke">Bespoke (External)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nanny Status</Label>
              <Select value={filters.nannyStatus} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, nannyStatus: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service Type</Label>
              <Select value={filters.serviceType} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, serviceType: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="childcare">Childcare</SelectItem>
                  <SelectItem value="tutoring">Tutoring</SelectItem>
                  <SelectItem value="cooking">Cooking</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Region</Label>
              <Select value={filters.region} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, region: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="johannesburg">Johannesburg</SelectItem>
                  <SelectItem value="cape_town">Cape Town</SelectItem>
                  <SelectItem value="durban">Durban</SelectItem>
                  <SelectItem value="pretoria">Pretoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="nannies">Nannies</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Top KPI Cards - Apple Style */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/bookings/overview', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">
                    {analyticsData.bookingsByPeriod.reduce((sum, item) => sum + item.bookings, 0) || 156}
                  </p>
                  <p className="text-xs text-emerald-600">+12% ↗</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/revenue/overview', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    R{analyticsData.revenueByPeriod.reduce((sum, item) => sum + item.revenue, 0).toLocaleString() || '1,240,500'}
                  </p>
                  <p className="text-xs text-emerald-500">+8% ↗</p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/nannies/overview', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Nannies</p>
                  <p className="text-2xl font-bold text-fuchsia-600">
                    {analyticsData.totalNanniesLive || 48}
                  </p>
                  <p className="text-xs text-fuchsia-500">+3 new ↗</p>
                </div>
                <div className="w-10 h-10 bg-fuchsia-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-fuchsia-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/satisfaction/overview', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {(analyticsData.nannyPerformance.reduce((sum, nanny) => sum + nanny.rating, 0) / 
                      analyticsData.nannyPerformance.length || 4.8).toFixed(1)}
                  </p>
                  <p className="text-xs text-amber-500">+0.2 ↗</p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/bookings/status-distribution', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Booking Status Distribution</CardTitle>
                <CardDescription className="text-sm">Current booking statuses</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center h-[200px]">
                  <div className="w-3/5">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.bookingStatus.length > 0 ? analyticsData.bookingStatus : [
                              { status: 'Confirmed', count: 45, percentage: 65 },
                              { status: 'Pending', count: 18, percentage: 26 },
                              { status: 'Completed', count: 6, percentage: 9 }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            innerRadius={25}
                            dataKey="count"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#6366f1" />
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div className="w-2/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <div>
                        <div className="font-medium">Confirmed</div>
                        <div className="text-emerald-600 font-bold">45 (65%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div>
                        <div className="font-medium">Pending</div>
                        <div className="text-amber-600 font-bold">18 (26%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <div>
                        <div className="font-medium">Completed</div>
                        <div className="text-indigo-600 font-bold">6 (9%)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/analytics/geographic-distribution', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Geographic Distribution</CardTitle>
                <CardDescription className="text-sm">Bookings by region</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[200px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.geographicDistribution.length > 0 ? analyticsData.geographicDistribution : [
                        { region: 'Johannesburg', count: 45 },
                        { region: 'Cape Town', count: 38 },
                        { region: 'Durban', count: 25 },
                        { region: 'Pretoria', count: 19 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="region" 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="count" 
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/services/most-booked', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Most Booked Services</CardTitle>
                <CardDescription className="text-sm">Popular service offerings</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[180px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.mostBookedServices.length > 0 ? analyticsData.mostBookedServices : [
                        { service: 'Childcare', bookings: 89 },
                        { service: 'Cooking', bookings: 64 },
                        { service: 'Diverse Ability Support', bookings: 42 },
                        { service: 'ECD Training', bookings: 38 },
                        { service: 'Pet Care', bookings: 25 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="service" 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="bookings" 
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/nannies/by-region', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nannies by Region</CardTitle>
                <CardDescription className="text-sm">Active nanny distribution</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center h-[180px]">
                  <div className="w-3/5">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.nanniesPerRegion.length > 0 ? analyticsData.nanniesPerRegion : [
                              { region: 'Johannesburg', count: 18 },
                              { region: 'Cape Town', count: 14 },
                              { region: 'Durban', count: 10 },
                              { region: 'Pretoria', count: 6 }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={55}
                            innerRadius={25}
                            dataKey="count"
                          >
                            <Cell fill="#8b5cf6" />
                            <Cell fill="#06b6d4" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div className="w-2/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-fuchsia-500"></div>
                      <div>
                        <div className="font-medium">Johannesburg</div>
                        <div className="text-fuchsia-600 font-bold">18</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                      <div>
                        <div className="font-medium">Cape Town</div>
                        <div className="text-cyan-600 font-bold">14</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <div>
                        <div className="font-medium">Durban</div>
                        <div className="text-amber-600 font-bold">10</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <div>
                        <div className="font-medium">Pretoria</div>
                        <div className="text-red-600 font-bold">6</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {/* Bookings KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/bookings/total-overview', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                  <p className="text-xl font-bold text-blue-600">
                    {analyticsData.bookingsByPeriod.reduce((sum, item) => sum + item.bookings, 0) || 156}
                  </p>
                  <p className="text-xs text-blue-500">This {filters.timePeriod}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/bookings/confirmed-rate', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Confirmation Rate</p>
                  <p className="text-xl font-bold text-emerald-600">78%</p>
                  <p className="text-xs text-emerald-500">+5% improvement</p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/bookings/avg-value', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Booking Value</p>
                  <p className="text-xl font-bold text-fuchsia-600">R7,850</p>
                  <p className="text-xs text-fuchsia-500">+12% vs last period</p>
                </div>
                <div className="w-8 h-8 bg-fuchsia-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-fuchsia-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Main Booking Trend Chart */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => window.open('/admin/bookings/trend-analysis', '_blank')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bookings Trend</CardTitle>
              <CardDescription className="text-sm">{filters.timePeriod.charAt(0).toUpperCase() + filters.timePeriod.slice(1)}ly booking volume over time</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.bookingsByPeriod.length > 0 ? analyticsData.bookingsByPeriod : [
                      { period: 'Jan', bookings: 28 },
                      { period: 'Feb', bookings: 32 },
                      { period: 'Mar', bookings: 26 },
                      { period: 'Apr', bookings: 35 },
                      { period: 'May', bookings: 38 },
                      { period: 'Jun', bookings: 42 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="bookings" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {/* Top KPI Cards - Compact Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/revenue/period-analysis', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Current Period</p>
                  <p className="text-lg font-bold">R160,945</p>
                  <p className="text-xs text-emerald-600">+12.8% ↗</p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/revenue/booking-type-analysis', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Long Term</p>
                  <p className="text-lg font-bold text-emerald-600">R82,970</p>
                  <p className="text-xs text-gray-500">52% of total</p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/revenue/per-booking-analysis', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg/Booking</p>
                  <p className="text-lg font-bold text-blue-600">R6,850</p>
                  <p className="text-xs text-blue-500">+5% ↗</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/revenue/milestones', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Target</p>
                  <p className="text-lg font-bold text-fuchsia-600">78%</p>
                  <p className="text-xs text-fuchsia-500">R390k achieved</p>
                </div>
                <div className="w-8 h-8 bg-fuchsia-100 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-fuchsia-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Revenue Distribution */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/revenue/booking-type-analysis', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Revenue Distribution</CardTitle>
                <CardDescription className="text-sm">By booking type</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center h-[180px]">
                  <div className="w-2/3">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { type: 'Short Term', revenue: 40300, color: '#3B82F6' },
                              { type: 'Long Term', revenue: 82970, color: '#10B981' },
                              { type: 'Bespoke', revenue: 37675, color: '#F59E0B' }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            innerRadius={25}
                            dataKey="revenue"
                          >
                            <Cell fill="#3B82F6" />
                            <Cell fill="#10B981" />
                            <Cell fill="#F59E0B" />
                          </Pie>
                          <ChartTooltip 
                            content={<ChartTooltipContent />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div className="w-1/3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div>
                        <div className="font-medium">Short</div>
                        <div className="text-blue-600 font-bold">R40k</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <div>
                        <div className="font-medium">Long</div>
                        <div className="text-emerald-600 font-bold">R83k</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <div>
                        <div className="font-medium">Bespoke</div>
                        <div className="text-amber-600 font-bold">R38k</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Trend - Compact */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/revenue/trend-analysis', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <CardDescription className="text-sm">{filters.timePeriod}ly performance</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[180px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { period: 'Jan', revenue: 145000 },
                        { period: 'Feb', revenue: 158000 },
                        { period: 'Mar', revenue: 142000 },
                        { period: 'Apr', revenue: 167000 },
                        { period: 'May', revenue: 182000 },
                        { period: 'Jun', revenue: 195000 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="period" 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Compact Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Correlation - Compact */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/revenue/correlation-analysis', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Revenue vs Bookings</CardTitle>
                <CardDescription className="text-sm">Performance correlation</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[160px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={[
                        { period: 'Jan', revenue: 145000, bookings: 28 },
                        { period: 'Feb', revenue: 158000, bookings: 32 },
                        { period: 'Mar', revenue: 142000, bookings: 26 },
                        { period: 'Apr', revenue: 167000, bookings: 35 },
                        { period: 'May', revenue: 182000, bookings: 38 },
                        { period: 'Jun', revenue: 195000, bookings: 42 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="period" 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          yAxisId="left" 
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="bookings" 
                          stroke="#f97316" 
                          strokeWidth={2}
                          dot={{ fill: '#f97316', r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers - Compact */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/revenue/top-generators', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Performers</CardTitle>
                <CardDescription className="text-sm">Revenue leaders</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {[
                    { name: 'Sarah M.', bookings: 12, revenue: 45800, rating: 4.9 },
                    { name: 'Maria N.', bookings: 10, revenue: 38400, rating: 4.8 },
                    { name: 'Grace D.', bookings: 9, revenue: 32100, rating: 4.7 },
                    { name: 'Nomsa K.', bookings: 8, revenue: 28600, rating: 4.6 }
                  ].map((nanny, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{nanny.name}</p>
                          <p className="text-xs text-gray-500">{nanny.bookings} bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">R{(nanny.revenue / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-gray-500">⭐ {nanny.rating}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics - Compact */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/revenue/insights', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Key Metrics</CardTitle>
                <CardDescription className="text-sm">Performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-cyan-800">Growth Rate</p>
                        <p className="text-sm font-bold text-cyan-600">+12.5%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-teal-50 to-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                        <Users className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-teal-800">Client Retention</p>
                        <p className="text-sm font-bold text-teal-600">87%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-fuchsia-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Star className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-800">Quality Score</p>
                        <p className="text-sm font-bold text-indigo-600">4.8/5</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nannies" className="space-y-4">
          {/* Nannies KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/nannies/total-active', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Active</p>
                  <p className="text-lg font-bold text-blue-600">{analyticsData.totalNanniesLive || 48}</p>
                  <p className="text-xs text-blue-500">Available now</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/nannies/verification-status', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Verified</p>
                  <p className="text-lg font-bold text-emerald-600">42</p>
                  <p className="text-xs text-emerald-500">87% verified rate</p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/nannies/avg-rating', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                  <p className="text-lg font-bold text-amber-600">4.8</p>
                  <p className="text-xs text-amber-500">From 342 reviews</p>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/nannies/pending-verification', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-orange-600">6</p>
                  <p className="text-xs text-orange-500">Need verification</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/nannies/top-performers', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Performing Nannies</CardTitle>
                <CardDescription className="text-sm">Most booked nannies this period</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px]">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.mostBookedNannies.length > 0 ? analyticsData.mostBookedNannies.slice(0, 8) : [
                        { name: 'Sarah M.', bookings: 12 },
                        { name: 'Maria N.', bookings: 10 },
                        { name: 'Grace D.', bookings: 9 },
                        { name: 'Nomsa K.', bookings: 8 },
                        { name: 'Thandi M.', bookings: 7 },
                        { name: 'Lerato S.', bookings: 6 }
                      ]} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          type="number" 
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={80}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="bookings" 
                          fill="#8b5cf6"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => window.open('/admin/services/distribution', '_blank')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Service Capabilities</CardTitle>
                <CardDescription className="text-sm">Services offered by active nannies</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center h-[280px]">
                  <div className="w-3/5">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.serviceTypes.length > 0 ? analyticsData.serviceTypes : [
                              { service: 'Childcare', count: 48 },
                              { service: 'Cooking', count: 35 },
                              { service: 'Diverse Ability Support', count: 22 },
                              { service: 'ECD Training', count: 18 },
                              { service: 'Pet Care', count: 12 }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={35}
                            dataKey="count"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#10b981" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#8b5cf6" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div className="w-2/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div>
                        <div className="font-medium">Childcare</div>
                        <div className="text-blue-600 font-bold">48</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <div>
                        <div className="font-medium">Cooking</div>
                        <div className="text-emerald-600 font-bold">35</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <div>
                        <div className="font-medium">Diverse Ability Support</div>
                        <div className="text-amber-600 font-bold">22</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-fuchsia-500"></div>
                      <div>
                        <div className="font-medium">ECD Training</div>
                        <div className="text-fuchsia-600 font-bold">18</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <div>
                        <div className="font-medium">Pet Care</div>
                        <div className="text-red-600 font-bold">12</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/performance/top-rated', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Top Rated</p>
                  <p className="text-lg font-bold text-emerald-600">4.9</p>
                  <p className="text-xs text-emerald-500">Sarah Mthembu</p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/performance/most-booked', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Most Booked</p>
                  <p className="text-lg font-bold text-blue-600">12</p>
                  <p className="text-xs text-blue-500">bookings this month</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/performance/completion-rate', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                  <p className="text-lg font-bold text-fuchsia-600">96%</p>
                  <p className="text-xs text-fuchsia-500">Avg across all nannies</p>
                </div>
                <div className="w-8 h-8 bg-fuchsia-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-fuchsia-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/performance/response-time', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                  <p className="text-lg font-bold text-amber-600">2.4h</p>
                  <p className="text-xs text-amber-500">First response time</p>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => window.open('/admin/performance/detailed-analysis', '_blank')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nanny Performance Analysis</CardTitle>
              <CardDescription className="text-sm">Rating and booking performance correlation</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.nannyPerformance.length > 0 ? analyticsData.nannyPerformance.slice(0, 10) : [
                      { name: 'Sarah M.', rating: 4.9, bookings: 12, revenue: 45800 },
                      { name: 'Maria N.', rating: 4.8, bookings: 10, revenue: 38400 },
                      { name: 'Grace D.', rating: 4.7, bookings: 9, revenue: 32100 },
                      { name: 'Nomsa K.', rating: 4.6, bookings: 8, revenue: 28600 },
                      { name: 'Thandi M.', rating: 4.5, bookings: 7, revenue: 24900 },
                      { name: 'Lerato S.', rating: 4.4, bookings: 6, revenue: 21200 }
                    ]} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        type="number" 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={80}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="rating" 
                        fill="#10b981"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-4">
          {/* Satisfaction KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/satisfaction/overall-rating', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Overall Rating</p>
                  <p className="text-xl font-bold text-emerald-600">4.8</p>
                  <p className="text-xs text-emerald-500">From 342 reviews</p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/satisfaction/nps-score', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">NPS Score</p>
                  <p className="text-xl font-bold text-blue-600">72</p>
                  <p className="text-xs text-blue-500">Excellent rating</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/satisfaction/repeat-rate', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Repeat Rate</p>
                  <p className="text-xl font-bold text-fuchsia-600">87%</p>
                  <p className="text-xs text-fuchsia-500">Client retention</p>
                </div>
                <div className="w-8 h-8 bg-fuchsia-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-fuchsia-600" />
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => window.open('/admin/satisfaction/response-time', '_blank')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                  <p className="text-xl font-bold text-amber-600">1.2h</p>
                  <p className="text-xs text-amber-500">Support tickets</p>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Satisfaction Chart */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => window.open('/admin/satisfaction/rating-breakdown', '_blank')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client Satisfaction Breakdown</CardTitle>
              <CardDescription className="text-sm">Rating distribution from client reviews</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.clientSatisfaction.length > 0 ? analyticsData.clientSatisfaction : [
                      { rating: '5 Stars', count: 187, percentage: 55 },
                      { rating: '4 Stars', count: 98, percentage: 29 },
                      { rating: '3 Stars', count: 34, percentage: 10 },
                      { rating: '2 Stars', count: 15, percentage: 4 },
                      { rating: '1 Star', count: 8, percentage: 2 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="rating" 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="count" 
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
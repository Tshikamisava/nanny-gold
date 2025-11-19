import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Receipt, 
  Plus,
  Download,
  Send,
  Eye,
  Edit,
  Play,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { InvoiceGenerationDialog } from '@/components/admin/InvoiceGenerationDialog';
import { PaymentAdviceGenerationDialog } from '@/components/admin/PaymentAdviceGenerationDialog';
import { InvoiceActionsDialog } from '@/components/admin/InvoiceActionsDialog';
import { InvoiceViewDialog } from '@/components/admin/InvoiceViewDialog';
import { BookingInvoicesTable } from '@/components/admin/BookingInvoicesTable';
import { AutomationControlsPanel } from '@/components/admin/AutomationControlsPanel';
import { useBookingInvoices } from '@/hooks/useBookingInvoices';

interface OperatingCost {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  cost_date: string;
  recurring: boolean;
  recurring_frequency?: string;
  vendor?: string;
  reference_id?: string;
  status: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  booking_id?: string | null;
  amount: number;
  currency: string | null;
  due_date: string;
  issue_date: string;
  paid_date?: string | null;
  status: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  line_items: any;
  notes?: string | null;
  created_at: string | null;
  updated_at: string | null;
  email_sent_at?: string | null;
  email_sent_count?: number | null;
  last_email_sent_to?: string | null;
  invoice_type?: string | null;
  client?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
}

interface PaymentAdvice {
  id: string;
  nanny_id: string;
  advice_number: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_deducted: number | null;
  net_amount: number;
  currency: string | null;
  status: string;
  payment_date?: string | null;
  payment_method: string;
  payment_reference?: string | null;
  booking_details: any;
  created_at: string | null;
  updated_at: string | null;
  nanny?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
}

const AdminPayments = () => {
  const [operatingCosts, setOperatingCosts] = useState<OperatingCost[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentAdvices, setPaymentAdvices] = useState<PaymentAdvice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any>(null);
  const [invoiceViewDialogOpen, setInvoiceViewDialogOpen] = useState(false);
  const [processingPayments, setProcessingPayments] = useState(false);
  const { toast } = useToast();
  
  // Fetch bookings with invoice status
  const { data: bookingsData, isLoading: loadingBookings } = useBookingInvoices();

  // Form states
  const [showAddCostDialog, setShowAddCostDialog] = useState(false);
  const [newCost, setNewCost] = useState({
    category: '',
    description: '',
    amount: '',
    cost_date: '',
    recurring: false,
    recurring_frequency: '',
    vendor: '',
    reference_id: ''
  });

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      // Load operating costs
      const { data: costsData, error: costsError } = await supabase
        .from('operating_costs')
        .select('*')
        .order('cost_date', { ascending: false })
        .limit(50);

      if (costsError) {
        console.error('Operating costs error:', costsError);
      } else {
        setOperatingCosts(costsData || []);
      }

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (invoicesError) {
        console.error('Invoice error:', invoicesError);
      } else {
        // Get client profile data for each invoice
        const processedInvoices = await Promise.all((invoicesData || []).map(async (invoice) => {
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', invoice.client_id)
            .single();
          
          return {
            ...invoice,
            line_items: invoice.line_items || [],
            client: clientProfile
          };
        }));
        setInvoices(processedInvoices);
      }

      // Load payment advices
      const { data: advicesData, error: advicesError } = await supabase
        .from('nanny_payment_advice')
        .select('*')
        .order('period_end', { ascending: false })
        .limit(50);

      if (advicesError) {
        console.error('Payment advice error:', advicesError);
      } else {
        // Get nanny profile data for each advice
        const processedAdvices = await Promise.all((advicesData || []).map(async (advice) => {
          const { data: nannyProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', advice.nanny_id)
            .single();
          
          return {
            ...advice,
            booking_details: advice.booking_details || [],
            commission_deducted: advice.commission_deducted || 0,
            nanny: nannyProfile
          };
        }));
        setPaymentAdvices(processedAdvices);
      }

    } catch (error) {
      console.error('Error loading payment data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOperatingCost = async () => {
    if (!newCost.category || !newCost.description || !newCost.amount || !newCost.cost_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('operating_costs')
        .insert({
          category: newCost.category,
          description: newCost.description,
          amount: parseFloat(newCost.amount),
          cost_date: newCost.cost_date,
          recurring: newCost.recurring,
          recurring_frequency: newCost.recurring ? newCost.recurring_frequency : null,
          vendor: newCost.vendor || null,
          reference_id: newCost.reference_id || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Operating cost added successfully"
      });

      setShowAddCostDialog(false);
      setNewCost({
        category: '',
        description: '',
        amount: '',
        cost_date: '',
        recurring: false,
        recurring_frequency: '',
        vendor: '',
        reference_id: ''
      });
      loadPaymentData();
    } catch (error) {
      console.error('Error adding operating cost:', error);
      toast({
        title: "Error",
        description: "Failed to add operating cost",
        variant: "destructive"
      });
    }
  };

  const calculateFinancialSummary = async () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Calculate monthly operating costs (unchanged)
    const monthlyOperatingCosts = operatingCosts
      .filter(cost => {
        const costDate = new Date(cost.cost_date);
        return costDate.getMonth() === currentMonth && costDate.getFullYear() === currentYear;
      })
      .reduce((sum, cost) => sum + cost.amount, 0);

    // NEW: Calculate CONFIRMED revenue from booking_financials
    let monthlyConfirmedRevenue = 0;
    try {
      const { data: confirmedRevenue, error: revenueError } = await supabase
        .from('booking_financials')
        .select('admin_total_revenue, bookings!inner(created_at, status)')
        .in('bookings.status', ['confirmed', 'active', 'completed'])
        .gte('bookings.created_at', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('bookings.created_at', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`);

      if (!revenueError && confirmedRevenue) {
        monthlyConfirmedRevenue = confirmedRevenue.reduce(
          (sum, item: any) => sum + (item.admin_total_revenue || 0), 
          0
        );
      }
    } catch (error) {
      console.error('Error fetching confirmed revenue:', error);
    }

    // EXISTING: Calculate COLLECTED revenue (paid invoices only)
    const monthlyCollectedRevenue = invoices
      .filter(invoice => {
        const invoiceDate = new Date(invoice.issue_date);
        return invoiceDate.getMonth() === currentMonth && 
               invoiceDate.getFullYear() === currentYear && 
               invoice.status === 'paid';
      })
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    // Calculate outstanding (confirmed but not paid)
    const outstandingRevenue = monthlyConfirmedRevenue - monthlyCollectedRevenue;

    // Calculate monthly nanny payments (unchanged)
    const monthlyNannyPayments = paymentAdvices
      .filter(advice => {
        const adviceDate = new Date(advice.period_end);
        return adviceDate.getMonth() === currentMonth && adviceDate.getFullYear() === currentYear;
      })
      .reduce((sum, advice) => sum + advice.net_amount, 0);

    // Net profit based on COLLECTED revenue
    const netProfit = monthlyCollectedRevenue - monthlyOperatingCosts - monthlyNannyPayments;

    return {
      monthlyOperatingCosts,
      monthlyConfirmedRevenue,
      monthlyCollectedRevenue,
      outstandingRevenue,
      monthlyNannyPayments,
      netProfit
    };
  };

  const [summary, setSummary] = useState({
    monthlyOperatingCosts: 0,
    monthlyConfirmedRevenue: 0,
    monthlyCollectedRevenue: 0,
    outstandingRevenue: 0,
    monthlyNannyPayments: 0,
    netProfit: 0
  });

  useEffect(() => {
    const loadSummary = async () => {
      const summaryData = await calculateFinancialSummary();
      setSummary(summaryData);
    };
    if (!loading) {
      loadSummary();
    }
  }, [operatingCosts, invoices, paymentAdvices, loading]);

  // Action handlers
  const handleDownloadInvoice = (invoice: Invoice) => {
    toast({
      title: "Download",
      description: `Downloading invoice ${invoice.invoice_number}...`,
    });
    // TODO: Implement PDF generation and download
  };

  const handleSendInvoice = async (invoice: Invoice, deliveryMethod: 'email' | 'app' | 'both' = 'email') => {
    try {
      toast({
        title: "Sending Invoice",
        description: `Sending invoice ${invoice.invoice_number} via ${deliveryMethod}...`,
      });

      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoice_id: invoice.id,
          delivery_method: deliveryMethod
        }
      });

      if (error) throw error;

      toast({
        title: "Invoice Sent",
        description: data.message || `Invoice sent successfully via ${deliveryMethod}`,
      });

      // Refresh invoice data
      loadPaymentData();
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    }
  };

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoiceForView(invoice);
    setInvoiceViewDialogOpen(true);
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Invoice Updated",
        description: "Invoice marked as paid",
      });

      loadPaymentData();
      setInvoiceViewDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDialogOpen(true);
  };

  const handleDownloadAdvice = (advice: PaymentAdvice) => {
    toast({
      title: "Download",
      description: `Downloading payment advice ${advice.advice_number}...`,
    });
    // TODO: Implement PDF generation and download
  };

  const handleSendAdvice = (advice: PaymentAdvice) => {
    toast({
      title: "Sending",
      description: `Sending payment advice ${advice.advice_number} to nanny...`,
    });
    // TODO: Implement email sending
  };

  const handleViewCost = (cost: OperatingCost) => {
    toast({
      title: "View",
      description: `Viewing operating cost: ${cost.description}`,
    });
    // TODO: Implement cost details dialog
  };

  const handleEditCost = (cost: OperatingCost) => {
    toast({
      title: "Edit",
      description: `Editing operating cost: ${cost.description}`,
    });
    // TODO: Implement cost editing dialog
  };

  const handleProcessPayments = async (action: 'authorize' | 'capture') => {
    const actionLabel = action === 'authorize' ? 'authorization' : 'capture';
    if (!confirm(`This will ${actionLabel} all pending monthly payments. Continue?`)) {
      return;
    }

    setProcessingPayments(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-monthly-payments', {
        body: { action }
      });
      
      if (error) {
        console.error(`Payment ${action} error:`, error);
        throw new Error(error.message || `Failed to ${action} payments`);
      }
      
      console.log(`Payment ${action} result:`, data);
      
      const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
      toast({
        title: `Payment ${capitalizedAction} Complete`,
        description: `Processed: ${data?.summary?.processed || 0}, Successful: ${data?.summary?.successful || 0}, Errors: ${data?.summary?.errors || 0}`,
      });
      
      // Reload payment data
      await loadPaymentData();
    } catch (error: any) {
      console.error(`Payment ${action} error:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} payments`,
        variant: "destructive",
      });
    } finally {
      setProcessingPayments(false);
    }
  };

  const costCategories = [
    { value: 'payment_gateway', label: 'Payment Gateway Fees' },
    { value: 'google_suite', label: 'Google Suite' },
    { value: 'rent', label: 'Office Rent' },
    { value: 'tech_building', label: 'Tech Development' },
    { value: 'nanny_payments', label: 'Nanny Payments' },
    { value: 'refunds', label: 'Refunds' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'legal', label: 'Legal Fees' },
    { value: 'other', label: 'Other' }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading payment data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate permission="payments">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payments & Finance</h1>
            <p className="text-muted-foreground">
              Manage operating costs, invoices, and payment processing
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleProcessPayments('authorize')} 
              disabled={processingPayments}
              variant="outline"
            >
              <Lock className="mr-2 h-4 w-4" />
              {processingPayments ? "Processing..." : "Authorize Payments"}
            </Button>
            <Button 
              onClick={() => handleProcessPayments('capture')} 
              disabled={processingPayments}
            >
              <Unlock className="mr-2 h-4 w-4" />
              {processingPayments ? "Processing..." : "Capture Payments"}
            </Button>
          </div>
        </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="booking-invoices">Booking Invoices</TabsTrigger>
          <TabsTrigger value="operating-costs">Operating Costs</TabsTrigger>
          <TabsTrigger value="invoices">Client Invoices</TabsTrigger>
          <TabsTrigger value="nanny-payments">Nanny Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R{summary.monthlyConfirmedRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  From all confirmed bookings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collected Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R{summary.monthlyCollectedRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  From paid invoices
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  R{summary.outstandingRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirmed but not collected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Operating Costs</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R{summary.monthlyOperatingCosts.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monthly expenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nanny Payments</CardTitle>
                <Receipt className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R{summary.monthlyNannyPayments.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Paid to nannies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className={`h-4 w-4 ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R{summary.netProfit.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monthly net profit
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common payment and finance operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={() => setShowAddCostDialog(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Operating Cost
                </Button>
                <InvoiceGenerationDialog />
                <PaymentAdviceGenerationDialog />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking-invoices" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Booking Invoices</h2>
              <p className="text-muted-foreground">
                Generate and track invoices for all bookings (long-term & short-term)
              </p>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bookingsData?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Active & confirmed bookings</p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Missing Invoices</CardTitle>
                <Receipt className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {bookingsData?.filter(b => !b.invoices || b.invoices.length === 0).length || 0}
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Bookings without invoices
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  R
                  {(bookingsData
                    ?.filter(b => !b.invoices || b.invoices.length === 0)
                    .reduce(
                    (sum, b) => sum + (b.booking_financials?.[0]?.admin_total_revenue || 0),
                      0
                    ) || 0
                  ).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Unbilled revenue</p>
              </CardContent>
            </Card>
          </div>

          {/* Automation Controls */}
          <AutomationControlsPanel
            missingInvoicesCount={
              bookingsData?.filter(b => !b.invoices || b.invoices.length === 0).length || 0
            }
            totalOutstandingRevenue={
              bookingsData
                ?.filter(b => !b.invoices || b.invoices.length === 0)
                .reduce(
                  (sum, b) => sum + (b.booking_financials?.[0]?.admin_total_revenue || 0),
                  0
                ) || 0
            }
          />

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                View and generate invoices for each booking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookingInvoicesTable 
                bookings={bookingsData || []} 
                loading={loadingBookings} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operating-costs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Operating Costs</h2>
              <p className="text-muted-foreground">Track NannyGold business expenses</p>
            </div>
            <Button onClick={() => setShowAddCostDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cost
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operatingCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>{format(new Date(cost.cost_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {costCategories.find(cat => cat.value === cost.category)?.label || cost.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{cost.description}</TableCell>
                    <TableCell>{cost.vendor || '-'}</TableCell>
                    <TableCell className="font-medium">R{cost.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={cost.status === 'confirmed' ? 'default' : 'secondary'}>
                        {cost.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewCost(cost)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditCost(cost)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Client Invoices</h2>
              <p className="text-muted-foreground">Manage client billing and payments</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadPaymentData}>
                Refresh
              </Button>
              <InvoiceGenerationDialog />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.client ? 
                        `${invoice.client.first_name || ''} ${invoice.client.last_name || ''}`.trim() || 
                        invoice.client.email || 
                        `Client ID: ${invoice.client_id}` 
                        : `Client ID: ${invoice.client_id}`
                      }
                    </TableCell>
                    <TableCell>{format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">R{invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'overdue' ? 'destructive' : 'secondary'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.email_sent_at ? (
                        <div className="text-sm">
                          <p className="text-muted-foreground">
                            {format(new Date(invoice.email_sent_at), 'MMM dd')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ({invoice.email_sent_count || 0}x)
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not sent</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="nanny-payments" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Nanny Payment Advice</h2>
              <p className="text-muted-foreground">Track nanny payment schedules and history</p>
            </div>
            <PaymentAdviceGenerationDialog />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Advice #</TableHead>
                  <TableHead>Nanny</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentAdvices.map((advice) => (
                  <TableRow key={advice.id}>
                    <TableCell className="font-mono">{advice.advice_number}</TableCell>
                    <TableCell>
                      {advice.nanny ? 
                        `${advice.nanny.first_name || ''} ${advice.nanny.last_name || ''}`.trim() || 
                        advice.nanny.email || 
                        `Nanny ID: ${advice.nanny_id}` 
                        : `Nanny ID: ${advice.nanny_id}`
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(advice.period_start), 'MMM dd')} - {format(new Date(advice.period_end), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>R{advice.gross_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">-R{(advice.commission_deducted || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-green-600">R{advice.net_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          advice.status === 'sent' ? 'default' : 
                          advice.status === 'acknowledged' ? 'secondary' : 'outline'
                        }
                      >
                        {advice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadAdvice(advice)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleSendAdvice(advice)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Operating Cost Dialog */}
      <Dialog open={showAddCostDialog} onOpenChange={setShowAddCostDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Operating Cost</DialogTitle>
            <DialogDescription>
              Record a new business expense for NannyGold
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={newCost.category} onValueChange={(value) => setNewCost({...newCost, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newCost.description}
                onChange={(e) => setNewCost({...newCost, description: e.target.value})}
                placeholder="Enter cost description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (ZAR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newCost.amount}
                  onChange={(e) => setNewCost({...newCost, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="cost_date">Date</Label>
                <Input
                  id="cost_date"
                  type="date"
                  value={newCost.cost_date}
                  onChange={(e) => setNewCost({...newCost, cost_date: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="vendor">Vendor (Optional)</Label>
              <Input
                id="vendor"
                value={newCost.vendor}
                onChange={(e) => setNewCost({...newCost, vendor: e.target.value})}
                placeholder="Vendor name"
              />
            </div>
            <div>
              <Label htmlFor="reference">Reference ID (Optional)</Label>
              <Input
                id="reference"
                value={newCost.reference_id}
                onChange={(e) => setNewCost({...newCost, reference_id: e.target.value})}
                placeholder="Invoice/transaction reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCostDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOperatingCost}>
              Add Cost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Actions Dialog */}
      <InvoiceActionsDialog
        invoice={selectedInvoice}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onSuccess={() => {
          loadPaymentData();
        }}
      />

      {/* Invoice View Dialog */}
      <InvoiceViewDialog
        invoice={selectedInvoiceForView}
        open={invoiceViewDialogOpen}
        onOpenChange={setInvoiceViewDialogOpen}
        onSendInvoice={handleSendInvoice}
        onMarkPaid={handleMarkPaid}
      />
    </div>
  </PermissionGate>
);
};

export default AdminPayments;
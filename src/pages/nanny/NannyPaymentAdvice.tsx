import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface PaymentAdvice {
  id: string;
  advice_number: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_deducted: number;
  net_amount: number;
  currency: string;
  status: string;
  payment_date?: string;
  payment_method: string;
  booking_details: any[];
  created_at: string;
}

interface PaymentNotification {
  id: string;
  payment_advice_id: string;
  sent_at: string;
  viewed_at?: string;
  downloaded_at?: string;
}

export default function NannyPaymentAdvice() {
  const [paymentAdvices, setPaymentAdvices] = useState<PaymentAdvice[]>([]);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPaymentData();
    }
  }, [user]);

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      // Load payment advice
      const { data: advicesData, error: advicesError } = await supabase
        .from('nanny_payment_advice')
        .select('*')
        .eq('nanny_id', user?.id)
        .order('period_end', { ascending: false });

      if (advicesError) {
        console.error('Payment advice error:', advicesError);
      } else {
        const processedAdvices = (advicesData || []).map(advice => ({
          ...advice,
          booking_details: Array.isArray(advice.booking_details) ? advice.booking_details : []
        }));
        setPaymentAdvices(processedAdvices);
      }

      // Load notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('nanny_payment_notifications')
        .select('*')
        .eq('nanny_id', user?.id)
        .order('sent_at', { ascending: false });

      if (notificationsError) {
        console.error('Notifications error:', notificationsError);
      } else {
        setNotifications(notificationsData || []);
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

  const handleViewAdvice = async (adviceId: string) => {
    // Mark as viewed
    await supabase
      .from('nanny_payment_notifications')
      .update({ viewed_at: new Date().toISOString() })
      .eq('payment_advice_id', adviceId)
      .eq('nanny_id', user?.id);

    loadPaymentData();
  };

  const handleDownloadAdvice = async (adviceId: string) => {
    try {
      // Mark as downloaded
      await supabase
        .from('nanny_payment_notifications')
        .update({ downloaded_at: new Date().toISOString() })
        .eq('payment_advice_id', adviceId)
        .eq('nanny_id', user?.id);

      // Generate and download payment advice PDF
      const { data, error } = await supabase.functions.invoke('generate-payment-advice-pdf', {
        body: { paymentAdviceId: adviceId }
      });

      if (error) throw error;

      // Find the advice for the file name
      const advice = paymentAdvices.find(a => a.id === adviceId);
      
      // Create download link
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-advice-${advice?.advice_number || 'unknown'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Your payment advice PDF is being generated"
      });

      loadPaymentData();
    } catch (error) {
      console.error('Error downloading advice:', error);
      toast({
        title: "Error",
        description: "Failed to download payment advice",
        variant: "destructive"
      });
    }
  };

  const getNotificationForAdvice = (adviceId: string) => {
    return notifications.find(n => n.payment_advice_id === adviceId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment advice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payment Advice</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View and download your payment advices and earnings history.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R{paymentAdvices
                  .filter(advice => {
                    const adviceDate = new Date(advice.period_end);
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    return adviceDate.getMonth() === currentMonth && adviceDate.getFullYear() === currentYear;
                  })
                  .reduce((sum, advice) => sum + advice.net_amount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Net earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R{paymentAdvices
                  .reduce((sum, advice) => sum + advice.net_amount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentAdvices.filter(advice => advice.status === 'generated').length}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Advice Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Your payment advices and earnings breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentAdvices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No payment advice available</p>
                <p className="text-sm text-muted-foreground">
                  Your payment advices will appear here once generated by admin
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advice No.</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentAdvices.map((advice) => {
                    const notification = getNotificationForAdvice(advice.id);
                    const isNew = notification && !notification.viewed_at;
                    
                    return (
                      <TableRow key={advice.id} className={isNew ? "bg-muted/50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{advice.advice_number}</span>
                            {isNew && (
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(advice.period_start), 'MMM dd')} - {format(new Date(advice.period_end), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {advice.currency} {advice.net_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              advice.status === 'paid' ? 'default' : 
                              advice.status === 'generated' ? 'secondary' : 'destructive'
                            }
                          >
                            {advice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewAdvice(advice.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadAdvice(advice.id)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
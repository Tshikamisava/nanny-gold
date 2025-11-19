import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceGenerationDialog } from '@/components/admin/InvoiceGenerationDialog';
import { PaymentAdviceGenerationDialog } from '@/components/admin/PaymentAdviceGenerationDialog';
import { useInvoices, usePaymentAdvices } from '@/hooks/useRewardsInvoicing';
import { Receipt, FileText, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const AdminInvoicingRewards = () => {
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const { data: paymentAdvices, isLoading: loadingAdvices } = usePaymentAdvices();
  const { toast } = useToast();
  const [generatingInvoices, setGeneratingInvoices] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'outline';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleGenerateMonthlyInvoices = async () => {
    if (!confirm('This will generate invoices for all active long-term bookings. Continue?')) {
      return;
    }

    setGeneratingInvoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-monthly-invoices', {
        body: {}
      });
      
      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message || 'Failed to invoke function');
      }
      
      console.log('Invoice generation result:', data);
      
      toast({
        title: "Monthly Invoices Generated",
        description: `Generated: ${data?.summary?.generated || 0}, Skipped: ${data?.summary?.skipped || 0}, Errors: ${data?.summary?.errors || 0}`,
      });
    } catch (error: any) {
      console.error('Invoice generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate monthly invoices",
        variant: "destructive",
      });
    } finally {
      setGeneratingInvoices(false);
    }
  };

  if (loadingInvoices || loadingAdvices) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalInvoicesAmount = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const totalRewardsApplied = invoices?.reduce((sum, inv) => sum + inv.rewards_applied, 0) || 0;
  const totalPaymentAdvicesAmount = paymentAdvices?.reduce((sum, adv) => sum + adv.total_amount, 0) || 0;
  const totalReferralRewardsPaid = paymentAdvices?.reduce((sum, adv) => sum + adv.referral_rewards_included, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoicing & Rewards</h1>
          <p className="text-muted-foreground mt-2">
            Generate client invoices and nanny payment advices with integrated rewards system
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateMonthlyInvoices} 
            disabled={generatingInvoices}
            variant="default"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {generatingInvoices ? "Generating..." : "Generate Monthly Invoices"}
          </Button>
          <InvoiceGenerationDialog />
          <PaymentAdviceGenerationDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalInvoicesAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{invoices?.length || 0} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards Applied</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalRewardsApplied.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Client savings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalPaymentAdvicesAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{paymentAdvices?.length || 0} payment advices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Rewards Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalReferralRewardsPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Nanny bonuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Client Invoices</TabsTrigger>
          <TabsTrigger value="payment-advices">Payment Advices</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Client Invoices</CardTitle>
              <CardDescription>
                Generated invoices with rewards integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Rewards Applied</TableHead>
                    <TableHead>Final Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No invoices generated yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices?.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {invoice.client ? 
                            `${invoice.client.first_name} ${invoice.client.last_name}` : 
                            'Unknown Client'
                          }
                        </TableCell>
                        <TableCell>R{(invoice.amount + invoice.rewards_applied).toFixed(2)}</TableCell>
                        <TableCell className="text-primary">
                          {invoice.rewards_applied > 0 ? 
                            `-R${invoice.rewards_applied.toFixed(2)}` : 
                            'None'
                          }
                        </TableCell>
                        <TableCell className="font-semibold">R{invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-advices">
          <Card>
            <CardHeader>
              <CardTitle>Nanny Payment Advices</CardTitle>
              <CardDescription>
                Generated payment advices with referral rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advice #</TableHead>
                    <TableHead>Nanny</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Referral Rewards</TableHead>
                    <TableHead>Total Payout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentAdvices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payment advices generated yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentAdvices?.map((advice) => (
                      <TableRow key={advice.id}>
                        <TableCell className="font-medium">{advice.advice_number}</TableCell>
                        <TableCell>
                          {advice.nanny ? 
                            `${advice.nanny.first_name} ${advice.nanny.last_name}` : 
                            'Unknown Nanny'
                          }
                        </TableCell>
                        <TableCell>R{advice.base_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-primary">
                          {advice.referral_rewards_included > 0 ? 
                            `+R${advice.referral_rewards_included.toFixed(2)}` : 
                            'None'
                          }
                        </TableCell>
                        <TableCell className="font-semibold">R{advice.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(advice.status)}>
                            {advice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(advice.payment_period_start).toLocaleDateString()} - {new Date(advice.payment_period_end).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
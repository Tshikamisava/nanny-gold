import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Plus, Trash2, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface PaymentMethod {
  id: string;
  card_type: string;
  last_four: string;
  exp_month: string;
  exp_year: string;
  bank: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  issue_date: string;
  paid_date?: string;
  line_items: any[];
  notes?: string;
}

export default function ClientPaymentSettings() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMethodDialog, setShowAddMethodDialog] = useState(false);
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
      // Load payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('client_payment_methods')
        .select('*')
        .eq('client_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (methodsError) {
        console.error('Payment methods error:', methodsError);
      } else {
        setPaymentMethods(methodsData || []);
      }

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (invoicesError) {
        console.error('Invoices error:', invoicesError);
      } else {
        const processedInvoices = (invoicesData || []).map(invoice => ({
          ...invoice,
          line_items: Array.isArray(invoice.line_items) ? invoice.line_items : []
        }));
        setInvoices(processedInvoices);
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

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      const { error } = await supabase
        .from('client_payment_methods')
        .update({ is_active: false })
        .eq('id', methodId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method removed successfully"
      });

      loadPaymentData();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to remove payment method",
        variant: "destructive"
      });
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: { invoice_id: invoiceId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment processed successfully"
      });

      loadPaymentData();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground">
          Manage your payment methods and billing information.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Add and manage your credit cards and payment methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Payment methods not available</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use EFT payment for all transactions. Upload proof of payment after making transfers.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <CreditCard className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {method.card_type.toUpperCase()} •••• {method.last_four}
                              </span>
                              {method.is_default && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Expires {method.exp_month}/{method.exp_year} • {method.bank}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    disabled
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    EFT Payment Only
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View your past payments and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No billing history available</p>
                <p className="text-sm text-muted-foreground">
                  Your payment history will appear here once you receive your first invoice
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {invoice.currency} {invoice.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            invoice.status === 'paid' ? 'default' : 
                            invoice.status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          {invoice.status === 'pending' && paymentMethods.length > 0 && (
                            <Button 
                              size="sm"
                              onClick={() => handlePayInvoice(invoice.id)}
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
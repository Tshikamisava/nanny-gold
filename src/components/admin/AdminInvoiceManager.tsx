import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useInvoices, useGenerateClientInvoice, useClientsWithRewards } from '@/hooks/useRewardsInvoicing';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send, Download, Mail, Bell, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceWithClient {
  id: string;
  invoice_number: string;
  amount: number;
  rewards_applied: number;
  status: string;
  issue_date: string;
  due_date: string;
  email_sent_at?: string;
  last_email_sent_to?: string;
  email_sent_count?: number;
  client?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export const AdminInvoiceManager = () => {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [description, setDescription] = useState('Service charges');
  const [applyRewards, setApplyRewards] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);

  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const { data: clients, isLoading: loadingClients } = useClientsWithRewards();
  const generateInvoice = useGenerateClientInvoice();
  const { toast } = useToast();

  const selectedClient = clients?.find(c => c.id === selectedClientId);
  const availableBalance = Array.isArray(selectedClient?.reward_balances) && selectedClient.reward_balances.length > 0
    ? selectedClient.reward_balances[0].available_balance
    : 0;
  const rewardsToApply = applyRewards ? Math.min(availableBalance, parseFloat(baseAmount) || 0) : 0;
  const finalAmount = (parseFloat(baseAmount) || 0) - rewardsToApply;

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId || !baseAmount) return;

    generateInvoice.mutate({
      client_id: selectedClientId,
      base_amount: parseFloat(baseAmount),
      apply_rewards: applyRewards,
      description
    });

    if (generateInvoice.isSuccess) {
      setShowGenerateDialog(false);
      setSelectedClientId('');
      setBaseAmount('');
      setDescription('Service charges');
      setApplyRewards(false);
    }
  };

  const handleSendInvoice = async (invoice: InvoiceWithClient, deliveryMethod: 'email' | 'app' | 'both') => {
    setSendingInvoice(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoice_id: invoice.id,
          delivery_method: deliveryMethod
        }
      });

      if (error) throw error;

      toast({
        title: "Invoice Sent Successfully",
        description: `Invoice ${invoice.invoice_number} sent to client via ${deliveryMethod}`,
      });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Failed to Send Invoice",
        description: error.message || 'Please try again or contact support.',
        variant: "destructive",
      });
    } finally {
      setSendingInvoice(null);
    }
  };

  const handleDownloadPdf = async (invoice: InvoiceWithClient) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoice.id }
      });

      if (error) throw error;

      if (data?.pdf_url) {
        const response = await fetch(data.pdf_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoice.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "PDF Downloaded",
          description: "Invoice PDF has been downloaded.",
        });
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast({
        title: "Download Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "outline",
      overdue: "destructive",
      cancelled: "secondary"
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-muted-foreground">
            Generate and send client invoices with PDF attachments
          </p>
        </div>

        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Client Invoice</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleGenerateInvoice} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingClients ? (
                        <SelectItem value="" disabled>Loading...</SelectItem>
                      ) : (
                        clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Base Amount (R)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Service description"
                />
              </div>

              {selectedClient && availableBalance > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Rewards Integration</CardTitle>
                    <CardDescription>
                      Client has R{availableBalance.toFixed(2)} in available rewards
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="apply-rewards"
                        checked={applyRewards}
                        onCheckedChange={(checked) => setApplyRewards(checked as boolean)}
                      />
                      <Label htmlFor="apply-rewards">Apply available rewards to this invoice</Label>
                    </div>

                    {baseAmount && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Amount:</span>
                          <span>R{parseFloat(baseAmount).toFixed(2)}</span>
                        </div>
                        {applyRewards && rewardsToApply > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>Rewards Credit:</span>
                            <span>-R{rewardsToApply.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Final Amount:</span>
                          <span>R{finalAmount.toFixed(2)}</span>
                        </div>
                        {applyRewards && rewardsToApply > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Remaining Rewards:</span>
                            <span>R{(availableBalance - rewardsToApply).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedClientId || !baseAmount || generateInvoice.isPending}
                >
                  {generateInvoice.isPending ? "Generating..." : "Generate & Send Invoice"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Invoices</CardTitle>
          <CardDescription>
            Manage and send client invoices with PDF attachments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invoices found. Generate your first invoice to get started.
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
                      <TableCell className="font-semibold">R{invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {invoice.email_sent_at ? (
                          <div className="text-sm">
                            <div className="text-green-600 font-medium">Sent</div>
                            <div className="text-muted-foreground">
                              {format(new Date(invoice.email_sent_at), 'MMM dd, yyyy')}
                              {invoice.email_sent_count && invoice.email_sent_count > 1 &&
                                ` (${invoice.email_sent_count} times)`
                              }
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">
                            Not Sent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Send Invoice to Client</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                  Choose how to send invoice {invoice.invoice_number} to the client.
                                  A PDF will be automatically generated and attached.
                                </p>
                                <div className="space-y-2">
                                  <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => handleSendInvoice(invoice, 'email')}
                                    disabled={sendingInvoice === invoice.id}
                                  >
                                    {sendingInvoice === invoice.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Mail className="w-4 h-4 mr-2" />
                                    )}
                                    Send via Email Only
                                  </Button>
                                  <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => handleSendInvoice(invoice, 'app')}
                                    disabled={sendingInvoice === invoice.id}
                                  >
                                    {sendingInvoice === invoice.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Bell className="w-4 h-4 mr-2" />
                                    )}
                                    Send to App Only
                                  </Button>
                                  <Button
                                    className="w-full justify-start"
                                    onClick={() => handleSendInvoice(invoice, 'both')}
                                    disabled={sendingInvoice === invoice.id}
                                  >
                                    {sendingInvoice === invoice.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Send className="w-4 h-4 mr-2" />
                                    )}
                                    Send Both Email & App
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPdf(invoice)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
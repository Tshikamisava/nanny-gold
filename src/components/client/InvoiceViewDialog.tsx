import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, CreditCard, AlertCircle, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InvoiceViewDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceViewDialog = ({ invoice, open, onOpenChange }: InvoiceViewDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Helper to calculate total hours from schedule
  const calculateTotalHours = (booking: any): number => {
    const schedule = booking.schedule;
    if (!schedule?.timeSlots || !schedule?.selectedDates) {
      return 8; // Default fallback
    }
    
    const dailyHours = schedule.timeSlots.reduce((total: number, slot: any) => {
      const start = new Date(`2000-01-01T${slot.start}:00`);
      const end = new Date(`2000-01-01T${slot.end}:00`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
    
    return dailyHours * schedule.selectedDates.length;
  };

  // Helper to calculate hourly rate (subtracting R35 booking fee for short-term)
  const calculateHourlyRate = (booking: any): string => {
    const totalHours = calculateTotalHours(booking);
    if (totalHours === 0) return '0.00';
    const bookingFee = 35;
    const serviceAmount = booking.base_rate - bookingFee;
    const hourlyRate = serviceAmount / totalHours;
    return hourlyRate.toFixed(2);
  };

  // Log invoice data for debugging
  console.log('📄 Invoice Dialog Data:', {
    hasInvoice: !!invoice,
    hasClient: !!invoice?.client,
    hasBooking: !!invoice?.booking,
    hasNanny: !!invoice?.nanny,
    clientName: invoice?.client ? `${invoice.client.first_name} ${invoice.client.last_name}` : 'N/A',
    nannyName: invoice?.nanny ? `${invoice.nanny.first_name} ${invoice.nanny.last_name}` : 'N/A'
  });

  if (!invoice) return null;

  const handlePayNow = () => {
    onOpenChange(false);
    navigate('/eft-payment', {
      state: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        bookingType: 'invoice_payment'
      }
    });
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoice.id }
      });

      if (error) throw error;

      if (data?.pdf_url) {
        // Fetch PDF as blob and force download
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
          description: "Your invoice PDF has been downloaded.",
        });
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast({
        title: "Download Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      paid: "default",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* NannyGold Company Information */}
          <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  <span className="text-primary">Nanny</span>
                  <span className="gold-shimmer">Gold</span>
                  <span className="text-muted-foreground text-sm ml-2 font-normal">(Pty) Ltd</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-3">Premium Nanny Services</p>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    care@nannygold.co.za
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    066 273 3942
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="text-lg font-semibold">{invoice.invoice_number}</p>
            </div>
            {getStatusBadge(invoice.status)}
          </div>

          {/* Client Information with Address */}
          {invoice.client && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-3">Client Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{invoice.client.first_name} {invoice.client.last_name}</p>
                </div>
                {invoice.client.location && (
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{invoice.client.location}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Details */}
          {invoice.booking ? (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-3">Booking Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Nanny Name - Always show */}
                {invoice.nanny && (
                  <div>
                    <p className="text-muted-foreground">Nanny</p>
                    <p className="font-medium">{invoice.nanny.first_name} {invoice.nanny.last_name}</p>
                  </div>
                )}
                
                {/* Service Type - Always show */}
                <div>
                  <p className="text-muted-foreground">Service Type</p>
                  <p className="font-medium">
                    {invoice.booking.booking_type === 'long_term' ? 'Long-term Care' : 'Short-term Care'}
                  </p>
                </div>
                
                {/* Start Date - Always show */}
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">{new Date(invoice.booking.start_date).toLocaleDateString('en-ZA')}</p>
                </div>
                
                {/* End Date - Only for short-term */}
                {invoice.booking.booking_type !== 'long_term' && invoice.booking.end_date && (
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-medium">{new Date(invoice.booking.end_date).toLocaleDateString('en-ZA')}</p>
                  </div>
                )}
                
                {/* Conditional: Living Arrangement for long-term */}
                {invoice.booking.booking_type === 'long_term' && invoice.booking.living_arrangement && (
                  <div>
                    <p className="text-muted-foreground">Living Arrangement</p>
                    <p className="font-medium">{invoice.booking.living_arrangement === 'live_in' ? 'Live In' : 'Live Out'}</p>
                  </div>
                )}
                
                {/* Conditional: Rate display based on booking type */}
                {invoice.booking.booking_type === 'long_term' ? (
                  <div>
                    <p className="text-muted-foreground">Monthly Service Fee</p>
                    <p className="font-medium">R{invoice.booking.base_rate?.toFixed(2)}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-muted-foreground">Total Hours</p>
                      <p className="font-medium">{calculateTotalHours(invoice.booking)} hours</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hourly Service Fee</p>
                      <p className="font-medium">R{calculateHourlyRate(invoice.booking)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-100 mb-1">
                    Limited Invoice Information
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This invoice was generated before our system upgrade. Detailed booking information is not available, but all payment details are correct and up to date.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Issue Date</p>
              <p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString('en-ZA')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString('en-ZA')}</p>
            </div>
          </div>

          <Separator />

          {/* Line Items with Column Headers */}
          <div>
            <h3 className="font-semibold mb-4">Invoice Items</h3>
            <div className="mb-2">
              <div className="flex justify-between items-center px-3 py-2 bg-muted rounded-t-lg">
                <span className="text-sm font-semibold text-muted-foreground">Description</span>
                <span className="text-sm font-semibold text-muted-foreground">Amount</span>
              </div>
            </div>
            <div className="space-y-2">
              {(invoice.line_items || []).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.description}</p>
                  </div>
                  <p className="font-semibold">R{item.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment Terms Explanation (for long-term bookings only) */}
          {invoice.booking?.booking_type === 'long_term' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-sm mb-1">What's Due Today:</p>
                  <p className="text-sm">The non-refundable placement fee of <span className="font-bold">R{invoice.amount.toFixed(2)}</span></p>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Monthly Service Fee:</p>
                  <p className="text-sm">The monthly service fee of <span className="font-bold">R{invoice.booking.base_rate?.toFixed(2)}</span> will be due on the last day of the Nanny's first month and each subsequent month thereafter for the duration of the booking.</p>
                </div>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
            <span className="text-lg font-semibold">Total Amount</span>
            <span className="text-2xl font-bold">R{invoice.amount.toFixed(2)}</span>
          </div>

          {/* Banking Details */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-3">Banking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="font-medium">NannyGold (Pty) Ltd</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-medium">Capitec Business</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="font-medium">1054131465</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch Code:</span>
                <span className="font-medium">450105</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Type:</span>
                <span className="font-medium">Current</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-medium text-primary">{invoice.invoice_number}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {invoice.status === 'pending' && (
              <Button onClick={handlePayNow} className="flex-1">
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Now
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={handleDownloadPdf} disabled={downloadingPdf}>
              <Download className="mr-2 h-4 w-4" />
              {downloadingPdf ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

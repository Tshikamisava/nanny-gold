import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, CreditCard, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InvoiceViewDialog } from "@/components/client/InvoiceViewDialog";

const ClientInvoices = () => {
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔍 Fetching invoices for client:', user.id);

      // Step 1: Fetch invoices with simple query
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (invoicesError) {
        console.error('❌ Invoice query error:', {
          message: invoicesError.message,
          details: invoicesError.details,
          hint: invoicesError.hint,
          code: invoicesError.code
        });
        throw invoicesError;
      }

      console.log('✅ Invoices loaded:', invoicesData?.length);

      if (!invoicesData || invoicesData.length === 0) {
        return [];
      }

      // Step 2: Fetch client profile once for all invoices
      const { data: clientProfile, error: clientError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone, location')
        .eq('id', user.id)
        .maybeSingle();

      if (clientError) {
        console.error('⚠️ Client profile fetch error:', clientError);
      }

      console.log('✅ Client profile loaded:', clientProfile);

      // Step 3: Enrich each invoice with client, booking, and nanny details
      const enrichedInvoices = await Promise.all(
        invoicesData.map(async (invoice) => {
          // Always add client profile
          const enrichedInvoice: any = {
            ...invoice,
            client: clientProfile
          };

          if (!invoice.booking_id) {
            return enrichedInvoice;
          }

          try {
            // Fetch booking details
            const { data: booking, error: bookingError } = await supabase
              .from('bookings')
              .select('id, start_date, end_date, booking_type, living_arrangement, base_rate, nanny_id, services, work_start_time, home_size')
              .eq('id', invoice.booking_id)
              .maybeSingle();

            if (bookingError) {
              console.error('⚠️ Booking fetch error for invoice:', invoice.id, bookingError);
              return enrichedInvoice;
            }

            if (!booking) {
              return enrichedInvoice;
            }

            // Fetch nanny profile if booking has nanny_id
            let nannyProfile = null;
            if (booking.nanny_id) {
              const { data: nannyData, error: nannyError } = await supabase
                .from('profiles')
                .select('first_name, last_name, location')
                .eq('id', booking.nanny_id)
                .maybeSingle();

              if (nannyError) {
                console.error('⚠️ Nanny profile fetch error:', nannyError);
              }

              nannyProfile = nannyData;
            }

            return {
              ...enrichedInvoice,
              booking: {
                ...booking,
                nanny: nannyProfile || null
              },
              nanny: nannyProfile || null // Add at top level for dialog compatibility
            };
          } catch (error) {
            console.error('⚠️ Error enriching invoice:', invoice.id, error);
            return enrichedInvoice;
          }
        })
      );

      console.log('✅ Enriched invoices:', enrichedInvoices.length);
      
      // Log sample invoice data for debugging
      if (enrichedInvoices.length > 0) {
        console.log('📊 Sample enriched invoice:', {
          id: enrichedInvoices[0]?.id,
          hasClient: !!enrichedInvoices[0]?.client,
          hasBooking: !!enrichedInvoices[0]?.booking,
          hasNanny: !!enrichedInvoices[0]?.nanny,
          clientData: enrichedInvoices[0]?.client,
          nannyData: enrichedInvoices[0]?.nanny
        });
      }

      return enrichedInvoices;
    }
  });

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handlePayNow = (invoice: any) => {
    console.log('🔵 Pay Now clicked for invoice:', {
      invoiceId: invoice.id,
      bookingId: invoice.booking_id,
      amount: invoice.amount
    });
    
    navigate('/eft-payment', {
      state: {
        invoiceId: invoice.id,
        bookingId: invoice.booking_id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        bookingType: 'invoice_payment'
      }
    });
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

  const isNewInvoice = (createdAt: string) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(createdAt) > sevenDaysAgo;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 md:h-8 md:w-8" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Invoices</h1>
      </div>

      {!invoices || invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your invoices will appear here once bookings are created. You'll receive notifications when new invoices are available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                      {isNewInvoice(invoice.created_at) && (
                        <Badge variant="secondary">New</Badge>
                      )}
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Issue Date</p>
                        <p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString('en-ZA')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due Date</p>
                        <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString('en-ZA')}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-2xl font-bold">R{invoice.amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInvoice(invoice)}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    {invoice.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handlePayNow(invoice)}
                        className="w-full sm:w-auto"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InvoiceViewDialog
        invoice={selectedInvoice}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default ClientInvoices;

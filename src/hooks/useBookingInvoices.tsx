import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BookingWithInvoice {
  id: string;
  client_id: string;
  nanny_id: string;
  booking_type: string;
  status: string;
  start_date: string;
  end_date?: string;
  total_monthly_cost: number;
  created_at: string;
  client?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  nanny?: {
    first_name?: string;
    last_name?: string;
  };
  booking_financials?: Array<{
    admin_total_revenue: number;
    fixed_fee: number;
    commission_amount: number;
  }>;
  invoices?: Array<{
    id: string;
    invoice_number: string;
    status: string;
    amount: number;
  }>;
}

export const useBookingInvoices = () => {
  return useQuery({
    queryKey: ['bookings-with-invoices'],
    queryFn: async () => {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['confirmed', 'active', 'pending', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each booking
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          // Fetch client profile with location
          const { data: clientProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, location')
            .eq('id', booking.client_id)
            .single();

          // Fetch nanny profile
          const { data: nannyProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', booking.nanny_id)
            .single();

          // Fetch booking financials
          const { data: financials } = await supabase
            .from('booking_financials')
            .select('admin_total_revenue, fixed_fee, commission_amount')
            .eq('booking_id', booking.id)
            .maybeSingle();

          // Fetch invoices with enriched data
          const { data: invoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('booking_id', booking.id);

          // Enrich each invoice with booking and client/nanny info
          const enrichedInvoices = (invoices || []).map(inv => ({
            ...inv,
            booking: booking,
            client: clientProfile,
            nanny: nannyProfile
          }));

          return {
            ...booking,
            client: clientProfile,
            nanny: nannyProfile,
            booking_financials: financials ? [financials] : [],
            invoices: enrichedInvoices,
          };
        })
      );

      return enrichedBookings as BookingWithInvoice[];
    },
  });
};

export const useGenerateBookingInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-booking-invoice', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: "Invoice Generated",
        description: `Invoice ${data?.invoice?.invoice_number} created successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    },
  });
};

export const useGenerateAllMissingInvoices = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-monthly-invoices', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      toast({
        title: "Bulk Invoice Generation Complete",
        description: `Generated: ${data?.summary?.generated || 0}, Skipped: ${data?.summary?.skipped || 0}, Errors: ${data?.summary?.errors || 0}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoices",
        variant: "destructive",
      });
    },
  });
};

export const useRegenerateInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, bookingId }: { invoiceId: string; bookingId: string }) => {
      // Delete old invoice
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (deleteError) throw deleteError;

      // Generate new invoice
      const { data, error } = await supabase.functions.invoke('generate-booking-invoice', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings-with-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: "Invoice Regenerated",
        description: `New invoice ${data?.invoice?.invoice_number} created successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate invoice",
        variant: "destructive",
      });
    },
  });
};

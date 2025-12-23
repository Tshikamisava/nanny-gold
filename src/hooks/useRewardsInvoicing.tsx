import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Invoice {
  id: string;
  client_id: string;
  booking_id?: string;
  amount: number;
  rewards_applied: number;
  rewards_balance_before: number;
  rewards_balance_after: number;
  invoice_number: string;
  line_items: any[];
  status: string;
  issue_date: string;
  due_date: string;
  client?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface PaymentAdvice {
  id: string;
  nanny_id: string;
  booking_id?: string;
  base_amount: number;
  referral_rewards_included: number;
  referral_rewards_details: any[];
  deductions: number;
  total_amount: number;
  payment_period_start: string;
  payment_period_end: string;
  advice_number: string;
  status: string;
  issue_date: string;
  payment_date?: string;
  nanny?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:profiles!client_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });
};

export const usePaymentAdvices = () => {
  return useQuery({
    queryKey: ['payment-advices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_advices')
        .select(`
          *,
          nanny:profiles!nanny_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentAdvice[];
    },
  });
};

export const useGenerateClientInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      client_id: string;
      base_amount: number;
      booking_id?: string;
      apply_rewards?: boolean;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('generate_client_invoice', {
        p_client_id: params.client_id,
        p_base_amount: params.base_amount,
        p_booking_id: params.booking_id || null,
        p_apply_rewards: params.apply_rewards || false,
        p_description: params.description || 'Service charges'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Parse invoice data if it's a string
      const invoiceData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['reward_balances'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      
      try {
        console.log('📧 Attempting to send invoice email for:', {
          invoiceId: invoiceData.id,
          invoiceNumber: invoiceData.invoice_number,
          clientId: invoiceData.client_id
        });
        
        // 1. Send email with PDF attachment using existing edge function
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-invoice-email', {
          body: { 
            invoice_id: invoiceData.id,
            delivery_method: 'both' // Email AND in-app
          }
        });
        
        if (emailError) {
          console.error('❌ Invoice email delivery failed:', emailError);
        } else {
          console.log('✅ Invoice email sent successfully:', emailResponse);
        }
        
        // 2. Verify in-app notification was created (by edge function)
        const { data: notification } = await supabase
          .from('client_invoice_notifications')
          .select('*')
          .eq('invoice_id', invoiceData.id)
          .single();
        
        if (!notification) {
          // Fallback: create notification if edge function didn't
          await supabase.from('client_invoice_notifications').insert({
            client_id: invoiceData.client_id,
            invoice_id: invoiceData.id,
            sent_at: new Date().toISOString()
          });
        }

        // Send admin notification for new invoice generation
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          await supabase.from('notifications').insert(
            admins.map(admin => ({
              user_id: admin.user_id,
              title: 'New Invoice Generated',
              message: `Invoice ${invoiceData.invoice_number} for R${invoiceData.amount.toFixed(2)} generated and sent to client`,
              type: 'admin_alert',
              data: {
                invoice_id: invoiceData.id,
                invoice_number: invoiceData.invoice_number,
                client_id: invoiceData.client_id,
                amount: invoiceData.amount,
                action: 'invoice_generated'
              }
            }))
          );
        }
        
        toast({
          title: "Invoice Generated & Sent",
          description: `Invoice ${invoiceData.invoice_number} sent to client via email and app`,
        });
      } catch (error) {
        console.error('Error sending invoice notifications:', error);
        toast({
          title: "Invoice Generated",
          description: "Invoice created but notification may have failed. Please verify client received it.",
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useGenerateNannyPaymentAdvice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      nanny_id: string;
      base_amount: number;
      period_start: string;
      period_end: string;
      booking_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('generate_nanny_payment_advice', {
        p_nanny_id: params.nanny_id,
        p_base_amount: params.base_amount,
        p_period_start: params.period_start,
        p_period_end: params.period_end,
        p_booking_id: params.booking_id || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-advices'] });
      queryClient.invalidateQueries({ queryKey: ['referral-logs'] });
      queryClient.invalidateQueries({ queryKey: ['reward_balances'] });
      toast({
        title: "Success",
        description: "Payment advice generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useClientsWithRewards = () => {
  return useQuery({
    queryKey: ['clients-with-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          reward_balances(
            total_earned,
            total_redeemed,
            available_balance
          )
        `)
        .eq('user_type', 'client');

      if (error) throw error;
      return data;
    },
  });
};

export const useNanniesWithRewards = () => {
  return useQuery({
    queryKey: ['nannies-with-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          referral_participants!user_id(
            id,
            referral_logs!referrer_id(
              id,
              reward_amount,
              status,
              created_at
            )
          )
        `)
        .eq('user_type', 'nanny');

      if (error) throw error;
      return data;
    },
  });
};
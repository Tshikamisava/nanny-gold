import { supabase } from '@/integrations/supabase/client';

export type EmailType = 'care' | 'bespoke';

export interface SendEmailParams {
  to: string[];
  from: EmailType;
  subject: string;
  html: string;
  replyTo?: string;
  senderName?: string;
}

export interface EmailLog {
  id: string;
  user_id: string;
  user_role: 'client' | 'nanny' | 'admin';
  from_address: string;
  to_addresses: string[];
  subject: string;
  status: 'sent' | 'failed' | 'bounced';
  resend_id: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Send email from NannyGold official email addresses
 * @param params Email parameters
 * @returns Promise with email result
 */
export const sendNannyGoldEmail = async (params: SendEmailParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    console.log('📧 Sending email from NannyGold:', {
      to: params.to,
      from: params.from,
      subject: params.subject,
      userId: user.id,
      userRole: profile.role
    });

    const { data, error } = await supabase.functions.invoke('send-nannygold-email', {
      body: {
        ...params,
        userId: user.id,
        userRole: profile.role,
      },
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw error;
    }

    console.log('✅ Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending NannyGold email:', error);
    throw error;
  }
};

/**
 * Get email logs for current user
 * @param limit Number of logs to retrieve
 * @returns Promise with email logs
 */
export const getUserEmailLogs = async (limit = 50): Promise<EmailLog[]> => {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
};

/**
 * Get all email logs (admin only)
 * @param limit Number of logs to retrieve
 * @returns Promise with all email logs
 */
export const getAllEmailLogs = async (limit = 100): Promise<EmailLog[]> => {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
};

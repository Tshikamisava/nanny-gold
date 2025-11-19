import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BespokeEmailContext {
  bookingType?: string;
  userInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export const openBespokeEmail = async (context?: BespokeEmailContext) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send a bespoke arrangement request.",
        variant: "destructive",
      });
      return;
    }

    // Fetch user profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', user.id)
      .single();

    const clientName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
      : context?.userInfo?.name || 'Unknown';
    const clientEmail = profile?.email || user.email || context?.userInfo?.email || '';
    const clientPhone = profile?.phone || context?.userInfo?.phone || '';

    // Build contextual information
    let serviceType = '';
    if (context?.bookingType) {
      const typeLabels: Record<string, string> = {
        'short_term': 'Short-Term Services',
        'date_night': 'Date Night Support',
        'date_day': 'Day Care Support',
        'emergency': 'Emergency Support',
        'temporary_support': 'Gap Coverage',
        'school_holiday': 'School Holiday Support'
      };
      serviceType = `\nInterested in: ${typeLabels[context.bookingType] || context.bookingType}`;
    }

    // Build email body
    const emailBody = `Bespoke Arrangement Request

Hi NannyGold Team,

I think I need something a little different and would like to discuss a custom arrangement that suits my unique requirements.

My Details are as follows:

Name: ${clientName}
Email: ${clientEmail}
Phone: ${clientPhone}${serviceType}

Bespoke Requirements: [Please describe your specific needs and preferences here].

Looking forward to connecting with the team regarding the above.

Thanks!
${clientName}`;

    // Open email client
    const mailtoLink = `mailto:bespoke@nannygold.co.za?subject=Bespoke Arrangement Request&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;

    // Show toast confirmation
    toast({
      title: "Email Client Opening",
      description: "Your bespoke arrangement request is ready to send to bespoke@nannygold.co.za",
    });
  } catch (error) {
    console.error('Error opening bespoke email:', error);
    toast({
      title: "Error",
      description: "Failed to prepare bespoke arrangement email. Please try again.",
      variant: "destructive",
    });
  }
};

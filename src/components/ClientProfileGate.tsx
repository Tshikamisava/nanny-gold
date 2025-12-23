import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { loadClientProfile } from '@/services/clientProfileService';
import { useToast } from '@/hooks/use-toast';
import { getUserRole } from '@/utils/userUtils';
import { Loader2 } from 'lucide-react';

interface ClientProfileGateProps {
  children: React.ReactNode;
  skipRedirect?: boolean; // Allow bypassing redirect for post-payment flows
}

export const ClientProfileGate = ({ children, skipRedirect = false }: ClientProfileGateProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      
      // Skip redirect if explicitly disabled (for post-payment flows)
      if (skipRedirect) {
        console.log('🔓 ClientProfileGate: Skipping redirect check (skipRedirect=true)');
        return;
      }

      // Never redirect if already on profile settings page (prevent loops)
      if (location.pathname === '/client/profile-settings') {
        console.log('🔓 ClientProfileGate: Already on profile settings, skipping check');
        return;
      }

      // Skip redirect for post-payment confirmation pages
      const postPaymentRoutes = ['/booking-confirmation', '/client/invoices', '/dashboard'];
      if (postPaymentRoutes.some(route => location.pathname.includes(route))) {
        console.log('🔓 ClientProfileGate: Skipping redirect check (post-payment route)');
        return;
      }

      // Skip redirect if coming from payment flow (check navigation state)
      const navigationState = (location.state as any);
      if (navigationState?.paymentMethod || navigationState?.paymentStatus || navigationState?.bookingId) {
        console.log('🔓 ClientProfileGate: Skipping redirect check (payment flow detected)');
        return;
      }

      // Skip redirect if URL has payment-related query params
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('payment') || searchParams.get('booking') || searchParams.get('reference')) {
        console.log('🔓 ClientProfileGate: Skipping redirect check (payment query params detected)');
        return;
      }
      
      try {
        // Check if user is admin - if so, skip client profile requirements
        const userRole = await getUserRole(user.id);
        if (userRole === 'admin') {
          return;
        }
        
        // Only check client profile for actual clients
        if (userRole === 'client') {
          // Check if user is starting a new booking (before loading profile)
          const isStartingNewBooking = ['/service-prompt', '/short-term-booking', '/living-arrangement', '/schedule-builder', '/nanny-preferences'].some(route => location.pathname.includes(route));
          
          let profile;
          try {
            profile = await loadClientProfile(user.id);
            
            // If profile is null but we're in a payment flow, don't redirect
            // The loadClientProfile function will use cached data on network errors
            if (!profile && (!isStartingNewBooking || location.pathname.includes('/payment'))) {
              console.warn('⚠️ ClientProfileGate: Profile is null, but allowing access for payment flow');
              return;
            }
          } catch (profileError: any) {
            // If profile load fails due to network error, try to get cached data
            if (profileError?.message?.includes('fetch') || profileError?.message?.includes('network') || profileError?.code === 'ERR_NETWORK') {
              console.warn('⚠️ ClientProfileGate: Network error loading profile, checking cache');
              
              // Try to get cached profile
              try {
                const cached = localStorage.getItem(`client-profile-${user.id}`);
                if (cached) {
                  const parsed = JSON.parse(cached);
                  if (parsed.data && parsed.timestamp) {
                    // Use cached data if it's less than 24 hours old
                    if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                      profile = parsed.data;
                      console.log('✅ ClientProfileGate: Using cached profile due to network error');
                    }
                  }
                }
              } catch (cacheError) {
                console.warn('⚠️ ClientProfileGate: Error reading cache:', cacheError);
              }
              
              // If we have cached profile, continue with check
              // If not, allow access to prevent blocking user flow
              if (!profile) {
                console.warn('⚠️ ClientProfileGate: No cached profile available, allowing access to prevent blocking user flow');
                return;
              }
            } else {
              throw profileError; // Re-throw other errors
            }
          }
          
          // More lenient check - only require location, childrenAges is optional
          const hasLocation = !!profile?.location && profile.location.trim() !== '';
          const hasChildren = (profile?.childrenAges?.filter(a => a && a.trim()).length || 0) > 0;
          
          // Only redirect if profile is truly incomplete AND user is starting a new booking
          // Don't redirect if they're completing an existing booking or payment
          if (isStartingNewBooking && !hasLocation) {
            console.log('⚠️ ClientProfileGate: Profile incomplete, redirecting to profile settings');
            toast({
              title: 'Complete your Family Information',
              description: 'Please finish the Family Information section before booking.',
              variant: 'destructive'
            });
            navigate('/client/profile-settings');
          } else {
            console.log('✅ ClientProfileGate: Profile check passed or not required for this route');
          }
        }
      } catch (e: any) {
        console.error('Error in ClientProfileGate:', e);
        // Don't redirect on errors - let the user continue
        // Network errors shouldn't block the user from completing their booking
        if (e?.message?.includes('fetch') || e?.message?.includes('network') || e?.code === 'ERR_NETWORK') {
          console.warn('⚠️ ClientProfileGate: Network error detected, allowing access to prevent blocking user flow');
        } else {
          console.warn('⚠️ ClientProfileGate: Error checking profile, allowing access to prevent blocking user flow');
        }
      }
    };
    run();
  }, [user, navigate, toast, location, skipRedirect]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

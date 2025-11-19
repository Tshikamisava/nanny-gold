import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { loadClientProfile } from '@/services/clientProfileService';
import { useToast } from '@/hooks/use-toast';
import { getUserRole } from '@/utils/userUtils';
import { Loader2 } from 'lucide-react';

interface ClientProfileGateProps {
  children: React.ReactNode;
}

export const ClientProfileGate = ({ children }: ClientProfileGateProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      
      try {
        // Check if user is admin - if so, skip client profile requirements
        const userRole = await getUserRole(user.id);
        if (userRole === 'admin') {
          return;
        }
        
        // Only check client profile for actual clients
        if (userRole === 'client') {
          const profile = await loadClientProfile(user.id);
          const isComplete = !!profile && !!profile.location && profile.location.trim() !== '' && (profile.childrenAges?.filter(a => a && a.trim()).length || 0) > 0;
          if (!isComplete) {
            toast({
              title: 'Complete your Family Information',
              description: 'Please finish the Family Information section before booking.',
              variant: 'destructive'
            });
            navigate('/client/profile-settings');
          }
        }
      } catch (e) {
        console.error('Error in ClientProfileGate:', e);
        // For non-clients, don't redirect to profile settings
      }
    };
    run();
  }, [user, navigate, toast]);

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

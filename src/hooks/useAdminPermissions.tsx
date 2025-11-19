import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { isDevelopmentMode } from '@/utils/userUtils';

interface AdminPermissions {
  payments: boolean;
  analytics: boolean;
  professional_development: boolean;
  user_management: boolean;
  verification: boolean;
  support: boolean;
  bookings: boolean;
  nannies: boolean;
  clients: boolean;
}

export const useAdminPermissions = () => {
  const [permissions, setPermissions] = useState<AdminPermissions>({
    nannies: false,
    clients: false,
    bookings: false,
    support: false,
    verification: false,
    payments: false,
    analytics: false,
    user_management: false,
    professional_development: false,
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // In development mode, always return super admin permissions
        if (isDevelopmentMode) {
          setPermissions({
            nannies: true,
            clients: true,
            bookings: true,
            support: true,
            verification: true,
            payments: true,
            analytics: true,
            user_management: true,
            professional_development: true,
          });
          setIsSuperAdmin(true);
          setLoading(false);
          return;
        }

        if (!user) {
          setPermissions({
            nannies: false,
            clients: false,
            bookings: false,
            support: false,
            verification: false,
            payments: false,
            analytics: false,
            user_management: false,
            professional_development: false,
          });
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        // Check if user is super admin
        const { data: superAdminData, error: superAdminError } = await supabase
          .rpc('is_super_admin', { user_uuid: user.id });

        if (superAdminError) {
          console.error('Error checking super admin status:', superAdminError);
        }

        const isSuper = superAdminData || false;
        setIsSuperAdmin(isSuper);

        // Get admin permissions
        const { data: permissionsData, error: permissionsError } = await supabase
          .rpc('get_admin_permissions', { user_uuid: user.id });

        if (permissionsError) {
          console.error('Error fetching admin permissions:', permissionsError);
        }

        const userPermissions = (permissionsData as any) || {};
        
        // If user has "all" permissions or is super admin, grant all permissions
        const hasAllPermissions = userPermissions.all === true || isSuper;
        
        setPermissions({
          nannies: hasAllPermissions || userPermissions.nannies || false,
          clients: hasAllPermissions || userPermissions.clients || false,
          bookings: hasAllPermissions || userPermissions.bookings || false,
          support: hasAllPermissions || userPermissions.support || false,
          verification: hasAllPermissions || userPermissions.verification || false,
          payments: hasAllPermissions || userPermissions.payments || false,
          analytics: hasAllPermissions || userPermissions.analytics || false,
          user_management: hasAllPermissions || userPermissions.user_management || false,
          professional_development: hasAllPermissions || userPermissions.professional_development || false,
        });

      } catch (error) {
        console.error('Error in fetchPermissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  return { permissions, isSuperAdmin, loading };
};
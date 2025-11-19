import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { getUserRole, getUserTenantRoute, UserRole } from '@/utils/userUtils';
import { Loader2 } from 'lucide-react';

interface TenantRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

const TenantRoute = ({ children, requiredRole }: TenantRouteProps) => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const role = await getUserRole(user.id);
        setUserRole(role);
        
        if (role !== requiredRole) {
          // Redirect admins to admin dashboard instead of allowing access to other routes
          if (role === 'admin') {
            navigate('/admin');
          } else if (role === 'client' && requiredRole !== 'client') {
            const correctRoute = getUserTenantRoute(role);
            navigate(correctRoute);
          } else if (role === 'nanny' && requiredRole === 'admin') {
            // Don't auto-redirect nannies away from admin routes - let them see access denied
          } else {
            const correctRoute = getUserTenantRoute(role);
            navigate(correctRoute);
          }
        }
      } catch (error) {
        console.error('TenantRoute: Error checking user role:', error);
        navigate('/login');
      } finally {
        setRoleLoading(false);
      }
    };

    if (!loading) {
      checkUserRole();
    }
  }, [user, loading, navigate, requiredRole]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  // Allow admins to access any route
  if (userRole === 'admin') {
    return <>{children}</>;
  }

  if (userRole !== requiredRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this section.
          </p>
          <button 
            onClick={() => navigate(getUserTenantRoute(userRole!))}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Go to your dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default TenantRoute;
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { Loader2 } from 'lucide-react';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const PublicRoute = ({ children, redirectTo = '/dashboard' }: PublicRouteProps) => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const [forceShow, setForceShow] = useState(false);

  // Defensive timeout: if loading takes too long, show content anyway
  useEffect(() => {
    console.log('🔍 PublicRoute - loading state:', loading, 'forceShow:', forceShow);
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Auth loading timeout (2s) - forcing content display');
        setForceShow(true);
      }, 2000); // Reduced from 5000ms to 2000ms for faster debugging
      
      return () => clearTimeout(timeout);
    }
  }, [loading, forceShow]);

  useEffect(() => {
    // If user is authenticated and we're on a public route, redirect them
    console.log('🔍 PublicRoute - checking redirect:', { loading, hasUser: !!user, redirectTo });
    if (!loading && user) {
      console.log('🚀 PublicRoute - Redirecting authenticated user to:', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  if (loading && !forceShow) {
    console.log('⏳ PublicRoute - Showing loading spinner');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, don't render the public route
  if (user && !forceShow) {
    console.log('🚫 PublicRoute - User authenticated, blocking render (will redirect)');
    return null;
  }

  console.log('✅ PublicRoute - Rendering children');
  return <>{children}</>;
};

export default PublicRoute;
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { getUserRole, UserRole } from '@/utils/userUtils';

// This component handles automatic redirection for authenticated users
const AuthRedirect = () => {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      if (!loading && user) {
        try {
          const role = await getUserRole(user.id);
          
          // Redirect based on user role
          switch (role) {
            case 'admin':
              navigate('/admin');
              break;
            case 'nanny':
              navigate('/nanny');
              break;
            case 'client':
            default:
              navigate('/dashboard');
              break;
          }
        } catch (error) {
          console.error('Error getting user role:', error);
          // Default to client dashboard
          navigate('/dashboard');
        }
      }
    };

    handleRedirect();
  }, [user, loading, navigate]);

  return null;
};

export default AuthRedirect;
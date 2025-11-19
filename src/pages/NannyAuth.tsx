import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/components/AuthProvider';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { getUserRole, getUserTenantRoute, type UserRole } from '@/utils/userUtils';
import { EmailOTPDialog } from '@/components/EmailOTPDialog';
import { supabase } from '@/integrations/supabase/client';

const NannyAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp } = useAuthContext();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handlePhoneSuccess = async () => {
    try {
      console.log('📱 handlePhoneSuccess - Starting authentication flow');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('📱 No user found after success');
        toast({
          title: "Authentication Error",
          description: "Please try signing in again.",
          variant: "destructive",
        });
        return;
      }

      console.log('📱 User authenticated:', user.id);
      
      // For nanny auth page, always redirect to nanny dashboard
      // Simplify by trusting that users on this page should be nannies
      console.log('📱 Redirecting to nanny dashboard');
      navigate('/nanny');
      
      toast({
        title: "Welcome to NannyGold!",
        description: "Your nanny account has been set up successfully.",
      });
      
    } catch (error) {
      console.error('📱 Error in handlePhoneSuccess:', error);
      toast({
        title: "Setup Error",
        description: "There was an issue setting up your account. Please contact support if this persists.",
        variant: "destructive",
      });
      // Still redirect to nanny dashboard as fallback
      navigate('/nanny');
    }
  };

  // Check URL params to set mode
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      const checkRoleAndRedirect = async () => {
        try {
          const role = await getUserRole(user.id);
          const route = getUserTenantRoute(role);
          navigate(route);
        } catch (error) {
          console.error('Error checking user role:', error);
          navigate('/nanny');
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success!",
            description: "Welcome back to NannyGold!",
          });
        }
      } else {
        setShowEmailOTP(true);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Nanny Sign In' : 'Join as a Nanny'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? 'Welcome back! Sign in to your nanny account'
              : 'Start your journey as a professional nanny with NannyGold'
            }
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>

            <div className="text-center text-sm">
              {isLogin ? (
                <span>
                  Don't have an account?{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setIsLogin(false)}
                  >
                    Sign up here
                  </Button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setIsLogin(true)}
                  >
                    Sign in here
                  </Button>
                </span>
              )}
            </div>


            {isLogin && (
              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-muted-foreground"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </Button>
              </div>
            )}

            <div className="text-center">
              <Button
                variant="link"
                className="text-sm text-muted-foreground"
                onClick={() => navigate('/')}
              >
                Need Help?
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
      
      <EmailOTPDialog
        open={showEmailOTP}
        onOpenChange={setShowEmailOTP}
        onSuccess={handlePhoneSuccess}
        purpose="signup"
        mode="signup"
        title="Create Your Nanny Account"
        description="We'll send you a verification code to get started"
      />

      <EmailOTPDialog
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
        onSuccess={(data) => {
          if (data?.resetUrl) {
            window.location.href = data.resetUrl;
          }
        }}
        purpose="password_reset"
        title="Reset Your Password"
        description="Enter your email to receive a password reset code"
      />
    </div>
  );
};

export default NannyAuth;
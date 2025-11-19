import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const AuthScreen = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') === 'signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Handle login
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message || "Please check your credentials and try again.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in."
        });
      } else {
        // Handle signup - validation first
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "Passwords do not match. Please try again.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Use email signup directly
        const { error } = await signUp(formData.email, formData.password, {
          first_name: formData.firstName,
          last_name: formData.lastName
        });
        
        if (error) {
          toast({
            title: "Signup Failed",
            description: error.message || "Please check your details and try again.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account."
        });
      }
      
      // User state will be updated and redirect will happen via useEffect
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await resetPassword(resetEmail);
      
      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message || "Failed to send reset email. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Reset Email Sent",
          description: "Check your email for password reset instructions.",
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-primary hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground ml-4">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
        </div>

        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </CardTitle>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Create your account as a parent or nanny'
              }
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Regular Form for Login or Signup */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="pl-10"
                            required={!isLogin}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="pl-10"
                            required={!isLogin}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        required={!isLogin}
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    isLogin ? 'Sign In' : 'Continue'
                  )}
                </Button>
              </form>
            
            {/* Forgot Password Section */}
            {isLogin && !showForgotPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-primary hover:underline text-sm mb-4"
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Forgot Password Form */}
            {showForgotPassword && (
              <div className="space-y-4 border-t pt-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Reset Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
                
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-foreground">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail('');
                      }}
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || !resetEmail}
                      className="flex-1 royal-gradient hover:opacity-90 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Only show toggle when not showing forgot password */}
            {!showForgotPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline text-sm"
                  disabled={loading}
                >
                  {isLogin 
                    ? "Don't have an account? Sign up" 
                    : 'Already have an account? Sign in'
                  }
                </button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Link 
            to="/" 
            className="text-muted-foreground hover:text-primary text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
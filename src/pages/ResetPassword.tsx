import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/components/AuthProvider';
import { ArrowLeft, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/PasswordStrengthIndicator';

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword, user, session } = useAuthContext();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for auth tokens in URL (from Supabase redirect)
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    
    // Handle error from Supabase
    if (error) {
      toast({
        title: "Reset Link Error",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive"
      });
      navigate('/forgot-password');
      return;
    }
    
    // If we have recovery type, this is a valid reset session
    if (type === 'recovery' && (accessToken || refreshToken)) {
      return; // Valid reset session, allow password reset
    }
    
    // Check if user is already authenticated (from the OTP flow)
    if (user && session) {
      return; // User is logged in, allow password reset
    }
    
    // If no valid session, redirect to forgot password
    toast({
      title: "Authentication Required",
      description: "Please request a new password reset.",
      variant: "destructive"
    });
    navigate('/forgot-password');
  }, [searchParams, navigate, toast, user, session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (passwords.newPassword !== passwords.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Validate password strength
      if (!isPasswordStrong(passwords.newPassword)) {
        toast({
          title: "Password Too Weak",
          description: "Please ensure your password meets all security requirements.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { error } = await updatePassword(passwords.newPassword);
      
      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message || "Failed to reset password. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated successfully. You can now log in with your new password.",
        });
        navigate('/login');
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
            onClick={() => navigate('/login')}
            className="text-primary hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground ml-4">
            Reset Password
          </h1>
        </div>

        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">
              Set New Password
            </CardTitle>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-foreground">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwords.newPassword}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
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
                {passwords.newPassword && (
                  <PasswordStrengthIndicator 
                    password={passwords.newPassword} 
                    className="mt-2"
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwords.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
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
              
              <Button 
                type="submit" 
                disabled={loading || !passwords.newPassword || !passwords.confirmPassword || !isPasswordStrong(passwords.newPassword)}
                className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
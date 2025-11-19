import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/components/AuthProvider';
import { Loader2, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { getUserRole } from '@/utils/userUtils';
import { supabase } from '@/integrations/supabase/client';
import { PhoneAuthDialog } from '@/components/PhoneAuthDialog';

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);

  const handlePhoneSuccess = async () => {
    // After phone sign-in, ensure the user is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const userRole = await getUserRole(user.id);
      if (userRole !== 'admin') {
        await signOut();
        toast({
          title: 'Access Denied',
          description: 'This login is restricted to administrators only.',
          variant: 'destructive'
        });
        return;
      }
      toast({ title: 'Admin Access Granted', description: 'Welcome to the admin dashboard.' });
      navigate('/admin');
    }
  };
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signOut } = useAuthContext();

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
      // Attempt to sign in
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

      // Get current user after successful login
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const userRole = await getUserRole(user.id);
        
        if (userRole !== 'admin') {
          // Sign out immediately if not admin
          await signOut();
          
          toast({
            title: "Access Denied",
            description: "This login is restricted to administrators only.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Admin Access Granted",
          description: "Welcome to the admin dashboard."
        });
        
        // Redirect to admin dashboard
        navigate('/admin');
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
    <div className="min-h-screen bg-background px-6 py-8 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">
              Admin Login
            </CardTitle>
            <p className="text-muted-foreground">
              Restricted access for administrators only
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@nannygold.com"
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
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Access Admin Dashboard
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center my-4">
                <div className="flex-1 border-t border-border"></div>
                <span className="px-3 text-xs text-muted-foreground">OR</span>
                <div className="flex-1 border-t border-border"></div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowPhoneAuth(true)}
                disabled={loading}
              >
                Sign in with Phone (OTP)
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Only authorized administrators can access this portal.
                <br />
                Unauthorized access attempts are logged.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
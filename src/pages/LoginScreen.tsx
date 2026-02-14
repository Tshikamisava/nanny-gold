
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Heart, ArrowLeft, Check, X, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase, checkSupabaseConnection } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserRole } from "@/utils/userUtils";
import { ConnectionMonitor } from "@/components/ConnectionMonitor";
import { AuthService } from "@/services/AuthService";
import { NannyGoldLogo } from "@/components/NannyGoldLogo";

const LoginScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Skip session clearing for performance

  // Skip email validation for faster login

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Reset states when email changes
    if (emailExists !== null) {
      setEmailExists(null);
    }
    if (emailError) {
      setEmailError("");
    }
    // Clear password when email changes
    if (password) {
      setPassword("");
    }
  };

  // Connection change handler
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await AuthService.login(email, password);
      
      if (!result.success) {
        toast({
          title: "Login Failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login Successful", 
        description: "Welcome back!",
      });
      
      // Let auth state change handle navigation
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Simplified input styling without validation icons

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">
        {/* Back Navigation */}
        <div className="absolute top-8 left-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* NannyGold Branding */}
        <div className="text-center mb-8">
          <NannyGoldLogo size="sm" className="mb-4" />
          <p className="text-muted-foreground text-lg">Welcome back</p>
        </div>

        {/* Connection Monitor */}
        <div className="w-full max-w-md mb-4">
          <ConnectionMonitor onConnectionChange={handleConnectionChange} />
        </div>

        {/* Login Form */}
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 py-4 text-lg"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-2xl border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 py-4 text-lg pr-10"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
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
          </div>
          
          {/* Login button */}
          <Button 
            onClick={handleLogin}
            disabled={!email || !password || isLoggingIn || !isConnected}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-4 text-lg rounded-2xl font-semibold shadow-lg"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing In...
              </>
            ) : !isConnected ? (
              'Connection Required'
            ) : (
              'Login'
            )}
          </Button>
          
          {/* Additional Actions */}
          <div className="w-full space-y-3">
            <div className="text-center">
              <Button 
                variant="ghost"
                onClick={() => navigate('/forgot-password')}
                className="text-muted-foreground hover:bg-muted/10 py-2 rounded-xl text-sm"
              >
                Forgot Password?
              </Button>
            </div>
            <div className="text-center">
              <Button 
                variant="ghost"
                onClick={() => navigate('/signup')}
                className="text-primary hover:bg-primary/10 py-3 rounded-xl"
              >
                Don't have an account? Sign up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Heart, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantRoute } from '@/utils/userUtils';

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Parse query parameters from URL
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email') || '';

  // Get signup data from sessionStorage
  const [signupData, setSignupData] = useState<any>(null);

  // Retrieve signup data from sessionStorage on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('signupData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setSignupData(data);
    } else {
      toast({
        title: "Missing Information",
        description: "Please complete the signup process again",
        variant: "destructive"
      });
      navigate('/signup');
    }
  }, [navigate, toast]);

  // Redirect if email doesn't match
  useEffect(() => {
    if (signupData && signupData.email !== email) {
      toast({
        title: "Invalid Session",
        description: "Please complete the signup process again",
        variant: "destructive"
      });
      navigate('/signup');
    }
  }, [signupData, email, navigate, toast]);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code",
        variant: "destructive"
      });
      return;
    }

    if (!signupData) {
      toast({
        title: "Session Expired",
        description: "Please complete the signup process again",
        variant: "destructive"
      });
      navigate('/signup');
      return;
    }

    setIsVerifying(true);

    try {
      // Call the verify-email-otp function
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: {
          email: email.toLowerCase().trim(),
          otp: otp,
          purpose: 'signup',
          userData: {
            first_name: signupData.name.split(' ')[0],
            last_name: signupData.name.split(' ').slice(1).join(' ') || '',
            phone: signupData.phone,
            user_type: signupData.userType || 'client',
            password: signupData.password,
            referral_code: signupData.referralCode || undefined
          }
        }
      });

      console.log('OTP verification response:', { data, error });

      if (error || !data?.success) {
        // Detailed error logging as requested
        const functionsError = error as any;
        console.error("--- EDGE FUNCTION ERROR DEBUG ---");
        console.error("Status:", functionsError?.status || functionsError?.context?.status);
        console.error("Message:", functionsError?.message);
        const details = functionsError?.details || functionsError?.context?.details || functionsError?.context;
        console.error("Details:", details);
        console.error("Data Error:", data?.error);
        console.error("---------------------------------");

        let errorMessage = data?.error || "The verification code is incorrect or has expired";

        if (error?.message) {
          if (error.message.includes("already exists")) {
            errorMessage = "An account with this email already exists. Please try logging in instead.";
          } else if (error.message.includes("Password must be at least 8 characters")) {
            errorMessage = "Password validation failed. Please restart the signup process.";
          } else if (error.message !== "Edge Function returned a non-2xx status code") {
            errorMessage = error.message;
          }
        }

        toast({
          title: "Verification Failed",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      // Clear sessionStorage on successful verification
      sessionStorage.removeItem('signupData');

      toast({
        title: "Account Created!",
        description: "Your account has been successfully created",
      });

      // Redirect based on user type
      const userType = signupData.userType || 'client';
      const route = getUserTenantRoute(userType);
      navigate(route);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!signupData) {
      toast({
        title: "Session Expired",
        description: "Please complete the signup process again",
        variant: "destructive"
      });
      navigate('/signup');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: email.toLowerCase().trim(),
          name: signupData.name.split(' ')[0],
          purpose: 'signup'
        }
      });

      if (error || !data?.success) {
        toast({
          title: "Failed to Resend",
          description: error?.message || "Could not send a new verification code",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification code",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6">
      <div className="max-w-sm mx-auto w-full">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/signup')} className="text-primary hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10"></div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-secondary/20">
            <Heart className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify Your Email</h1>
          <p className="text-muted-foreground">Enter the 6-digit code sent to {email}</p>
        </div>

        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader>
            <CardTitle className="text-center text-foreground">Email Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.length !== 6}
              className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold"
            >
              {isVerifying ? "Verifying..." : "Verify & Create Account"}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
              <Button
                variant="link"
                onClick={handleResendOtp}
                className="text-primary p-0 hover:text-primary/80"
              >
                Resend Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OtpVerification;
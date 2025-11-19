import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Heart, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { email, password, name, phone, expectedOtp } = location.state || {};

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code",
        variant: "destructive"
      });
      return;
    }

    if (otp !== expectedOtp) {
      toast({
        title: "Invalid OTP",
        description: "The verification code is incorrect",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      const { data, error } = await signUp(email, password, {
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '',
        phone: phone,
        user_type: 'client'
      });

      if (error) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Your account has been successfully created",
        });
        navigate('/client/profile-settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    // In a real implementation, you'd call the send-otp function again
    toast({
      title: "OTP Resent",
      description: "A new verification code has been sent to your email",
    });
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
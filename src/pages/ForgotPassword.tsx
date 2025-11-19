import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Mail, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword } = useAuthContext();
  
  const [step, setStep] = useState<"requestEmail" | "otpVerify" | "resetPass">("requestEmail");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");

  // Send OTP email using our custom function
  const handleRequestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { 
          email, 
          name: 'User', // We don't have the name at this point
          purpose: 'password_reset' 
        }
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: "Please check your email for the 6-digit verification code.",
      });
      
      // Move to OTP verification step
      setStep("otpVerify");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Sending OTP verification:', { email, otp, purpose: 'password_reset' });
      
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { 
          email, 
          otp, 
          purpose: 'password_reset' 
        }
      });

      console.log('OTP verification raw response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || "Failed to verify OTP");
      }
      
      if (data?.success) {
        // Store the reset token for password update
        if (data?.reset_token) {
          setResetToken(data.reset_token);
        }
        
        setStep("resetPass");
        toast({
          title: "OTP Verified",
          description: "You can now set your new password.",
        });
      } else {
        console.error('OTP verification failed:', data);
        const errorMessage = data?.error || "Invalid OTP. Please try again.";
        
        // If OTP was already used, suggest requesting a new one
        if (errorMessage.includes("already been used") || errorMessage.includes("expired")) {
          toast({
            title: "Code Invalid",
            description: errorMessage + " Would you like to request a new code?",
            variant: "destructive"
          });
          // Optionally go back to email step
          // setStep("requestEmail");
        } else {
          throw new Error(errorMessage);
        }
      }
    } catch (error: any) {
      toast({
        title: "Invalid OTP",
        description: error.message || "Please check your code and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (passwords.newPassword !== passwords.confirmPassword) {
        throw new Error("Passwords do not match. Please try again.");
      }

      // Validate password length
      if (passwords.newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      // Use our custom password update function with reset token
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: { 
          email,
          newPassword: passwords.newPassword,
          resetToken
        }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to update password");

      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated successfully.",
      });
      
      // Reset form and redirect to login
      setStep("requestEmail");
      setEmail("");
      setOtp("");
      setPasswords({ newPassword: "", confirmPassword: "" });
      setResetToken("");
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "requestEmail": return "Forgot Password?";
      case "otpVerify": return "Check Your Email";
      case "resetPass": return "Set New Password";
      default: return "Reset Password";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "requestEmail": return "Enter your email to receive a 6-digit verification code";
      case "otpVerify": return "We've sent a verification code to your email (expires in 10 minutes)";
      case "resetPass": return "Enter your new password below";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">
        {/* Back Navigation */}
        <div className="absolute top-8 left-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/login')}
            className="text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            {step === "resetPass" ? (
              <Lock className="w-10 h-10 text-primary" />
            ) : (
              <Mail className="w-10 h-10 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {getStepTitle()}
          </h1>
          <p className="text-muted-foreground">
            {getStepDescription()}
          </p>
        </div>

        {/* Main Card */}
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            {/* Step 1: Request Email */}
            {step === "requestEmail" && (
              <form onSubmit={handleRequestEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !email}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold"
                >
                   {loading ? (
                     <>
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       Sending Code...
                     </>
                  ) : (
                     'Send Verification Code'
                  )}
                </Button>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {step === "otpVerify" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-center text-lg tracking-wider"
                    maxLength={6}
                    required
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Code sent to {email}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !otp}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("requestEmail")}
                  className="w-full"
                >
                  Back to Email
                </Button>
              </form>
            )}

            {/* Step 3: Reset Password */}
            {step === "resetPass" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
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
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10 pr-10"
                      required
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
                
                <Button 
                  type="submit" 
                  disabled={loading || !passwords.newPassword || !passwords.confirmPassword}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold"
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
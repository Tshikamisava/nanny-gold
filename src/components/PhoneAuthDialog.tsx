import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Phone, User, ArrowLeft } from 'lucide-react';

interface PhoneAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode?: 'login' | 'signup';
}

export const PhoneAuthDialog = ({ open, onOpenChange, onSuccess, mode = 'signup' }: PhoneAuthDialogProps) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState('');
  const [userDetails, setUserDetails] = useState({
    firstName: '',
    lastName: '',
    userType: 'client' as 'client' | 'nanny' | 'admin'
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Phone number validation function
  const validatePhoneNumber = (number: string) => {
    if (!number) {
      return 'Phone number is required';
    }
    if (number.length !== 9) {
      return `Phone number must be exactly 9 digits (currently ${number.length})`;
    }
    if (number.startsWith('0')) {
      return 'Phone number cannot start with 0 (use +27 instead of +270)';
    }
    return '';
  };

  const handleSendOtp = async () => {
    // Strict validation before sending
    const phoneValidationError = validatePhoneNumber(phoneNumber);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      toast({
        title: "Invalid phone number",
        description: phoneValidationError,
        variant: "destructive"
      });
      return;
    }

    // Double-check: prevent sending if phone number is invalid
    if (!phoneNumber || phoneNumber.length !== 9 || phoneNumber.startsWith('0')) {
      const errorMsg = phoneNumber.startsWith('0') 
        ? 'Remove the leading 0 – use format after +27'
        : `Phone number must be exactly 9 digits (currently ${phoneNumber.length})`;
      
      setPhoneError(errorMsg);
      toast({
        title: "Invalid phone number",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    if (mode === 'signup' && (!userDetails.firstName.trim() || !userDetails.lastName.trim())) {
      toast({
        title: "Name required",
        description: "Please enter your first and last name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-otp', {
        body: { 
          phoneNumber: phoneNumber,
          firstName: userDetails.firstName
        }
      });

      if (error) throw error;

      if (data?.success) {
        setStep('otp');
        toast({
          title: "OTP Sent",
          description: `Verification code sent to +27${phoneNumber}`
        });
      } else {
        throw new Error(data?.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Use Edge Function to verify OTP for both login and signup flows
      const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
        body: {
          phoneNumber: phoneNumber,
          otp,
          isLogin: mode === 'login',
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          userType: userDetails.userType
        }
      });

      if (error) throw error;

      if (data?.success) {
        console.log('OTP verification successful:', data);
        
        // Enhanced session handling with multiple approaches
        let sessionEstablished = false;
        
        try {
          // Approach 1: Try to set session if tokens are available
          if (data?.session?.access_token && data?.session?.refresh_token) {
            console.log('Setting session with tokens from response');
            const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            });
            
            if (!sessionError && sessionResult?.session) {
              sessionEstablished = true;
              console.log('Session established successfully via tokens');
            } else {
              console.error('Failed to set session via tokens:', sessionError);
            }
          }
          
          // Approach 2: Fallback - wait for auth state change
          if (!sessionEstablished) {
            console.log('Waiting for auth state change...');
            await new Promise((resolve) => {
              const timeout = setTimeout(() => resolve(null), 3000);
              const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (session && event === 'SIGNED_IN') {
                  sessionEstablished = true;
                  clearTimeout(timeout);
                  subscription.unsubscribe();
                  resolve(session);
                }
              });
            });
          }
          
        } catch (sessionError) {
          console.error('Session establishment failed:', sessionError);
        }

        // Show success message
        toast({
          title: mode === 'login' ? 'Signed in successfully!' : 'Account created successfully!',
          description: mode === 'login' 
            ? 'Your phone number has been verified and you are now signed in.'
            : 'Your phone number has been verified and your account created.'
        });

        // Close dialog and reset form
        onOpenChange(false);
        resetForm();

        // Enhanced redirect logic with multiple fallbacks
        const performRedirect = async () => {
          try {
            // Priority 1: Use current session
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            
            if (currentSession?.user?.id) {
              console.log('Redirecting using current session user:', currentSession.user.id);
              const { getUserRole, getUserTenantRoute } = await import('@/utils/userUtils');
              
              try {
                const role = await getUserRole(currentSession.user.id);
                const route = getUserTenantRoute(role);
                console.log(`Redirecting ${role} user to ${route}`);
                navigate(route);
                return;
              } catch (roleError) {
                console.error('Error getting role for current session user:', roleError);
              }
            }
            
            // Priority 2: Use verification response user data
            if (data?.user?.id) {
              console.log('Redirecting using verification response user:', data.user.id);
              const { getUserRole, getUserTenantRoute, getFallbackRoute } = await import('@/utils/userUtils');
              
              try {
                const role = await getUserRole(data.user.id);
                const route = getUserTenantRoute(role);
                console.log(`Redirecting ${role} user to ${route} (from response)`);
                navigate(route);
                return;
              } catch (roleError) {
                console.error('Error getting role for response user:', roleError);
                const fallbackRoute = getFallbackRoute(data.user);
                console.log(`Using fallback route for response user: ${fallbackRoute}`);
                navigate(fallbackRoute);
                return;
              }
            }
            
            // Priority 3: Use userType from signup flow
            if (data?.userType || userDetails.userType) {
              const userType = data.userType || userDetails.userType;
              const fallbackRoute = userType === 'nanny' ? '/nanny' : 
                                   userType === 'admin' ? '/admin' : '/dashboard';
              console.log(`Redirecting based on userType ${userType} to: ${fallbackRoute}`);
              navigate(fallbackRoute);
              return;
            }
            
            // Priority 4: Default based on signup mode
            const defaultRoute = mode === 'login' ? '/dashboard' : '/dashboard';
            console.log(`Final fallback redirect to: ${defaultRoute}`);
            navigate(defaultRoute);
            
          } catch (error) {
            console.error('Critical error during redirect:', error);
            // Ultimate safety fallback
            navigate('/dashboard');
          }
        };

        // Execute redirect with proper timing
        if (sessionEstablished) {
          // If session is already established, redirect immediately
          setTimeout(performRedirect, 100);
        } else {
          // If session needs time to establish, wait longer
          setTimeout(performRedirect, 1000);
        }
        
        // Trigger consumer update
        onSuccess();
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        status: error.status,
        details: error.details
      });
      toast({
        title: 'Verification failed',
        description: `Error: ${error?.message || 'Could not verify the code. Please try again.'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('phone');
    setPhoneNumber('');
    setPhoneError('');
    setOtp('');
    setUserDetails({ firstName: '', lastName: '', userType: 'client' as 'client' | 'nanny' | 'admin' });
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'phone' && (
              <Button variant="ghost" size="icon" onClick={goBack} disabled={loading}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle>
              {mode === 'login' 
                ? (step === 'phone' ? "Sign in with Phone" : "Verify Phone Number")
                : (step === 'phone' ? "Sign up with Phone" : "Verify Phone Number")
              }
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'phone' && (
            <>
              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        value={userDetails.firstName}
                        onChange={(e) => setUserDetails(prev => ({ ...prev, firstName: e.target.value }))}
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        value={userDetails.lastName}
                        onChange={(e) => setUserDetails(prev => ({ ...prev, lastName: e.target.value }))}
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userType">I am a...</Label>
                    <Select 
                      value={userDetails.userType} 
                      onValueChange={(value: 'client' | 'nanny' | 'admin') => 
                        setUserDetails(prev => ({ ...prev, userType: value }))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Parent/Family looking for a nanny</SelectItem>
                        <SelectItem value="nanny">Nanny seeking employment</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <div className="flex">
                    <div className="bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input text-sm font-medium text-muted-foreground">
                      +27
                    </div>
                    <Input
                      id="phone"
                      placeholder="123456789"
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ""); // strip non-digits
                        setPhoneNumber(value);

                        // Validation logic
                        if (value.length === 0) {
                          setPhoneError("Phone number is required");
                          return;
                        }

                        if (value.startsWith("0")) {
                          setPhoneError("Remove the leading 0 – use format after +27");
                          return;
                        }

                        if (value.length > 9) {
                          setPhoneError("Phone number must be 9 digits (after +27)");
                          return;
                        }

                        if (value.length < 9) {
                          setPhoneError("Phone number must be 9 digits (after +27)");
                          return;
                        }

                        // If valid
                        setPhoneError("");
                      }}
                      className={`pl-10 rounded-l-none ${phoneError ? 'border-destructive' : ''}`}
                      disabled={loading}
                      maxLength={9}
                      pattern="[1-9][0-9]{8}"
                    />
                  </div>
                </div>
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  We'll send you a verification code via SMS
                </p>
              </div>

              <Button 
                onClick={handleSendOtp}
                disabled={loading || !phoneNumber || !!phoneError || phoneNumber.length !== 9 || (mode === 'signup' && (!userDetails.firstName || !userDetails.lastName))}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to
                </p>
                <p className="font-semibold">+27{phoneNumber}</p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  mode === 'login' ? 'Verify & Sign In' : 'Verify & Create Account'
                )}
              </Button>

              <Button 
                variant="ghost"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full"
              >
                Resend Code
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
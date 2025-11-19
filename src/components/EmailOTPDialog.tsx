import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

interface EmailOTPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data?: any) => void;
  purpose: 'signup' | 'password_reset';
  mode?: 'signup' | 'login';
  title?: string;
  description?: string;
}

export const EmailOTPDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  purpose, 
  mode = 'signup',
  title,
  description 
}: EmailOTPDialogProps) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [userDetails, setUserDetails] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    if (purpose === 'signup' && (!userDetails.firstName || !userDetails.lastName)) {
      toast({
        title: "Details required",
        description: "Please enter your first and last name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { 
          email,
          name: userDetails.firstName || 'User',
          phone: userDetails.phone,
          purpose
        }
      });

      if (error) throw error;

      if (data.success) {
        setStep('otp');
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${email}`
        });
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
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: {
          email,
          otp,
          purpose,
          userData: purpose === 'signup' ? {
            first_name: userDetails.firstName,
            last_name: userDetails.lastName,
            phone: userDetails.phone,
            user_type: 'nanny'
          } : undefined
        }
      });

      if (error) throw error;

      if (purpose === 'signup' && data?.session?.access_token) {
        // Set session for new user
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }

      toast({
        title: purpose === 'signup' ? 'Account created successfully!' : 'OTP verified!',
        description: purpose === 'signup' 
          ? 'Your email has been verified and your account created.'
          : 'You can now reset your password.'
      });

      onOpenChange(false);
      resetForm();
      onSuccess(data);
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error?.message || 'Could not verify the code. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setUserDetails({ firstName: '', lastName: '', phone: '' });
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('email');
      setOtp('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'email' && (
              <Button variant="ghost" size="icon" onClick={goBack} disabled={loading}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle>
              {title || (step === 'email' ? 
                (purpose === 'signup' ? "Create Nanny Account" : "Reset Password") : 
                "Verify Email"
              )}
            </DialogTitle>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {step === 'email' && (
            <>
              {purpose === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        value={userDetails.firstName}
                        onChange={(e) => setUserDetails(prev => ({ ...prev, firstName: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        value={userDetails.lastName}
                        onChange={(e) => setUserDetails(prev => ({ ...prev, lastName: e.target.value }))}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      placeholder="+27 xxx xxx xxxx"
                      value={userDetails.phone}
                      onChange={(e) => setUserDetails(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll send you a verification code via email
                </p>
              </div>

              <Button 
                onClick={handleSendOtp}
                disabled={loading || !email || (purpose === 'signup' && (!userDetails.firstName || !userDetails.lastName))}
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
                <p className="font-semibold">{email}</p>
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
                  purpose === 'signup' ? 'Verify & Create Account' : 'Verify Code'
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
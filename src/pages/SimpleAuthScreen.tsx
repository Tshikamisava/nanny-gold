import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, Mail, Lock, User, Phone, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { getUserRole, getUserTenantRoute } from '@/utils/userUtils';

const SimpleAuthScreen = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') === 'signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [referralCodeValid, setReferralCodeValid] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [validatingCode, setValidatingCode] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    userType: '',
    referralCode: ''
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, resetPassword } = useAuth();

  // Redirect if already authenticated with role-based routing
  useEffect(() => {
    const redirectBasedOnRole = async () => {
      if (user) {
        try {
          const role = await getUserRole(user.id);
          const route = getUserTenantRoute(role);
          navigate(route);
        } catch (error) {
          console.error('Error determining user role:', error);
          // Use user metadata as fallback
          const { getFallbackRoute } = await import('@/utils/userUtils');
          const fallbackRoute = getFallbackRoute(user);
          navigate(fallbackRoute);
        }
      }
    };

    redirectBasedOnRole();
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 6) {
      setReferralCodeValid(false);
      setDiscountPercentage(0);
      return;
    }

    setValidatingCode(true);
    try {
      // 1. Check Influencer/Partner Codes first
      const { data: influencerData, error: influencerError } = await supabase
        .from('referral_participants')
        .select('id, discount_percentage, is_influencer, influencer_name, user_id')
        .eq('referral_code', code.toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (influencerData && !influencerError) {
        setReferralCodeValid(true);
        setDiscountPercentage(influencerData.discount_percentage || 20);
        toast({
          title: "Valid Referral Code!",
          description: `You'll receive ${influencerData.discount_percentage || 20}% off your placement fee`,
        });
        return;
      }

      // 2. Check Client Referral Codes
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name')
        .eq('referral_code', code.toUpperCase())
        .maybeSingle();

      if (clientData && !clientError) {
        setReferralCodeValid(true);
        setDiscountPercentage(0); // Client referrals might not give invitee discount, only referrer reward
        toast({
          title: "Valid Referral Code!",
          description: "Referral code applied successfully.",
        });
      } else {
        setReferralCodeValid(false);
        setDiscountPercentage(0);
        toast({
          title: "Invalid Code",
          description: "This referral code is not valid or has expired",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralCodeValid(false);
      setDiscountPercentage(0);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
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
        // Determine user type
        let detectedUserType = formData.userType || 'client';
        if (formData.email?.includes('nanny') || formData.email?.includes('caregiver')) {
          detectedUserType = 'nanny';
        } else {
          detectedUserType = 'client';
        }

        // If user chose phone signup, send SMS OTP directly
        if (signupMethod === 'phone') {
          if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
            toast({
              title: "Missing Information",
              description: "Please fill in all required fields",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }

          // Send SMS OTP
          const { data, error } = await supabase.functions.invoke('send-sms-otp', {
            body: {
              phoneNumber: formData.phone.trim(),
              firstName: formData.firstName
            }
          });

          if (error || !data.success) {
            toast({
              title: "SMS Failed",
              description: error?.message || "Failed to send verification code. Please try again.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }

          // Store pending signup data and move to OTP step
          setPendingSignupData({
            ...formData,
            detectedUserType
          });
          setSignupStep('otp');
          setLoading(false);
          return;
        }

        // Email signup flow - send email OTP
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Send email OTP
        const { data, error } = await supabase.functions.invoke('send-otp', {
          body: {
            email: formData.email.trim(),
            name: formData.firstName,
            purpose: 'signup'
          }
        });

        console.log('OTP verification response:', { data, error });

        if (error || !data.success) {
          toast({
            title: "Email Failed",
            description: error?.message || "Failed to send verification code. Please try again.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Store pending signup data and move to OTP step
        setPendingSignupData({
          ...formData,
          detectedUserType
        });
        setSignupStep('otp');
        setLoading(false);
        return;
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

  // OTP verification for phone signup
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!pendingSignupData || !otp || otp.length !== 6) {
        toast({
          title: "Invalid OTP",
          description: "Please enter a valid 6-digit verification code",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Use appropriate OTP verification based on signup method
      const isPhoneSignup = signupMethod === 'phone';
      const { data, error } = await supabase.functions.invoke(
        isPhoneSignup ? 'verify-sms-otp' : 'verify-email-otp',
        {
          body: isPhoneSignup ? {
            phoneNumber: pendingSignupData.phone,
            otp,
            userData: {
              first_name: pendingSignupData.firstName,
              last_name: pendingSignupData.lastName,
              phone: pendingSignupData.phone,
              user_type: pendingSignupData.detectedUserType,
              referral_code: pendingSignupData.referralCode
            }
          } : {
            email: pendingSignupData.email,
            otp,
            purpose: 'signup',
            userData: {
              first_name: pendingSignupData.firstName,
              last_name: pendingSignupData.lastName,
              phone: pendingSignupData.phone,
              user_type: pendingSignupData.detectedUserType,
              password: pendingSignupData.password,
              referral_code: pendingSignupData.referralCode
            }
          }
        }
      );

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

        let errorMessage = data?.error || "Invalid verification code. Please try again.";

        if (error?.message) {
          if (error.message.includes("already exists")) {
            errorMessage = "An account with this email already exists.";
          } else if (error.message !== "Edge Function returned a non-2xx status code") {
            errorMessage = error.message;
          }
        }

        toast({
          title: "Verification Failed",
          description: errorMessage,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (data && data.success) {
        // Extract session tokens from edge function response
        const sessionData = data.session;

        if (!sessionData?.access_token || !sessionData?.refresh_token) {
          toast({
            title: "Session Error",
            description: "Account created but session could not be established. Please try logging in.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Establish session using tokens from edge function
        const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token
        });

        if (sessionError) {
          console.error('Session establishment error:', sessionError);
          toast({
            title: "Session Error",
            description: "Account created but session could not be established. Please try logging in.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // LINK REFERRER if code was provided
        if (pendingSignupData.referralCode) {
          try {
            const code = pendingSignupData.referralCode.toUpperCase();
            // Find referrer ID (Input could be Influencer or Client code)
            // Check Influencer
            const { data: infData } = await supabase
              .from('referral_participants')
              .select('user_id')
              .eq('referral_code', code)
              .maybeSingle();

            let referrerId = infData?.user_id;

            if (!referrerId) {
              // Check Client
              const { data: clientData } = await supabase
                .from('clients')
                .select('id')
                .eq('referral_code', code)
                .maybeSingle();
              referrerId = clientData?.id;
            }

            if (referrerId && sessionResult.session?.user?.id) {
              const { error: updateError } = await supabase
                .from('clients')
                .update({ referred_by: referrerId })
                .eq('id', sessionResult.session.user.id);

              if (updateError) {
                console.error("Failed to link referral:", updateError);
              } else {
                console.log("Referral linked successfully");
              }
            }
          } catch (refError) {
            console.error("Error linking referral:", refError);
          }
        }

        toast({
          title: "Account Created Successfully!",
          description: "Welcome to NannyGold! Redirecting to your dashboard...",
        });

        // Wait for auth state to propagate, then redirect
        setTimeout(() => {
          try {
            const route = getUserTenantRoute(pendingSignupData.detectedUserType);
            navigate(route);
          } catch (error) {
            console.error('Error determining route:', error);
            navigate('/dashboard');
          }
        }, 500);

      } else {
        toast({
          title: "Verification Failed",
          description: "Could not verify your phone number. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during OTP verification:', error);
      toast({
        title: "Verification Error",
        description: "An unexpected error occurred. Please try again.",
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

  const handleGoBackToForm = () => {
    setSignupStep('form');
    setOtp('');
  };

  const handleResendOtp = async () => {
    if (!pendingSignupData) return;

    setLoading(true);
    try {
      const isPhoneSignup = signupMethod === 'phone';
      const { data, error } = await supabase.functions.invoke(
        isPhoneSignup ? 'send-sms-otp' : 'send-otp',
        {
          body: isPhoneSignup ? {
            phoneNumber: pendingSignupData.phone.trim(),
            firstName: pendingSignupData.firstName
          } : {
            email: pendingSignupData.email.trim(),
            name: pendingSignupData.firstName,
            purpose: 'signup'
          }
        }
      );

      if (error) throw error;

      if (data.success) {
        toast({
          title: "OTP Sent",
          description: isPhoneSignup
            ? `New verification code sent to ${data.phoneNumber || pendingSignupData.phone}`
            : `New verification code sent to ${pendingSignupData.email}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message || "Could not resend verification code.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto">
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
              {isLogin ? 'Sign In' : 'Join NannyGold'}
            </CardTitle>
            <p className="text-muted-foreground">
              {isLogin
                ? 'Enter your credentials to access your account'
                : 'Create your account to get started'
              }
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Forgot Password Form */}
            {showForgotPassword ? (
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
            ) : (
              /* OTP Verification Step for Phone Signup */
              !isLogin && signupStep === 'otp' ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleGoBackToForm}
                      className="text-primary hover:bg-accent"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Verify Your {signupMethod === 'phone' ? 'Phone' : 'Email'}</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the code sent to {signupMethod === 'phone' ? pendingSignupData?.phone : pendingSignupData?.email}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-foreground">Verification Code</Label>
                      <div className="flex justify-center">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          className="gap-2"
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
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & Create Account'
                      )}
                    </Button>
                  </form>

                  <div className="text-center text-sm text-muted-foreground">
                    Didn't receive the code?{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary"
                      onClick={handleResendOtp}
                      disabled={loading}
                    >
                      Resend
                    </Button>
                  </div>
                </div>
              ) : (
                /* Main Login/Signup Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* HIDDEN: Signup Method Selector - kept for post-launch */}
                  {/* { !isLogin && (
                    <div className="flex bg-muted rounded-lg p-1 mb-6">
                      <Button
                        type="button"
                        variant={signupMethod === 'email' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSignupMethod('email')}
                        className="flex-1"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                      <Button
                        type="button"
                        variant={signupMethod === 'phone' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSignupMethod('phone')}
                        className="flex-1"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Phone
                      </Button>
                    </div>
                  )} */ }

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

                      <div className="space-y-2">
                        <Label htmlFor="userType" className="text-foreground">I am a...</Label>
                        <Select
                          value={formData.userType}
                          onValueChange={(value) => {
                            setFormData(prev => ({ ...prev, userType: value }));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Chief of Home seeking family support</SelectItem>
                            <SelectItem value="nanny">Family Support Specialist offering family support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>


                      {/* Referral Code Input - Only show for clients */}
                      {formData.userType === 'client' && (
                        <div className="space-y-2">
                          <Label htmlFor="referralCode" className="text-foreground">
                            Referral Code <span className="text-muted-foreground text-xs">(Optional)</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="referralCode"
                              name="referralCode"
                              type="text"
                              placeholder="Enter your referral code"
                              value={formData.referralCode}
                              onChange={(e) => {
                                const code = e.target.value.toUpperCase();
                                setFormData({ ...formData, referralCode: code });
                                if (code.length >= 6) {
                                  validateReferralCode(code);
                                } else {
                                  setReferralCodeValid(false);
                                  setDiscountPercentage(0);
                                }
                              }}
                              className="uppercase"
                              maxLength={20}
                            />
                            {validatingCode && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          {referralCodeValid && formData.referralCode && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                  Code Applied Successfully!
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                  Get {discountPercentage}% off your placement fee
                                </p>
                              </div>
                            </div>
                          )}
                          {formData.referralCode && formData.referralCode.length >= 6 && !referralCodeValid && !validatingCode && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Invalid or expired referral code
                            </p>
                          )}
                        </div>
                      )}

                      {/* HIDDEN: Phone field - kept for post-launch */}
                      <div className="space-y-2" style={{ display: 'none' }}>
                        <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="0123456789"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {signupMethod === 'phone'
                            ? 'SMS verification will be sent to this number'
                            : 'Required for account security and notifications'
                          }
                        </p>
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

                  {signupMethod === 'email' && (
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
                  )}

                  {!isLogin && signupMethod === 'email' && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="pl-10"
                          required={!isLogin && signupMethod === 'email'}
                          minLength={6}
                        />
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
                        {isLogin ? 'Signing In...' : 'Creating Account...'}
                      </>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </Button>
                </form>
              ))}

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

            {/* Only show toggle when not showing forgot password */}
            {!showForgotPassword && signupStep === 'form' && (
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
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-primary text-sm"
          >
            Need Help?
          </button>
        </div>
      </div >
    </div >
  );
};

export default SimpleAuthScreen;
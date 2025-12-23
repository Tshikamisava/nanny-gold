import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBooking } from '@/contexts/BookingContext';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { saveClientProfile, ClientProfileData } from '@/services/clientProfileService';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Heart, X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface FormData {
  // Auth data
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;

  // Profile data
  location: string;
  numberOfChildren: number;
  childrenAges: string[];
  otherDependents: number;
  petsInHome: string;
  homeSize: string;
  specialNeeds: boolean;
  drivingSupport: boolean;
  cooking: boolean;
}

const SignupWithProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const { updatePreferences } = useBooking();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    // Auth data
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // Profile data
    location: '',
    numberOfChildren: 0,
    childrenAges: [''],
    otherDependents: 0,
    petsInHome: '',
    homeSize: '',
    specialNeeds: false,
    drivingSupport: false,
    cooking: false,
  });

  const updateForm = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addChildAge = () => {
    setFormData(prev => ({
      ...prev,
      childrenAges: [...prev.childrenAges, '']
    }));
  };

  const updateChildAge = (index: number, age: string) => {
    setFormData(prev => ({
      ...prev,
      childrenAges: prev.childrenAges.map((a, i) => i === index ? age : a)
    }));
  };

  const removeChildAge = (index: number) => {
    setFormData(prev => ({
      ...prev,
      childrenAges: prev.childrenAges.filter((_, i) => i !== index)
    }));
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }

    setEmailChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking email:', error);
        setEmailAvailable(null);
        return;
      }

      setEmailAvailable(!data);
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };


  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const validateStep1 = () => {
    // Check all required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return false;
    }

    // Validate phone format (basic South African format)
    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive"
      });
      return false;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return false;
    }

    // Check for at least one number and one letter
    const hasNumber = /\d/.test(formData.password);
    const hasLetter = /[a-zA-Z]/.test(formData.password);
    if (!hasNumber || !hasLetter) {
      toast({
        title: "Weak Password",
        description: "Password must contain both letters and numbers",
        variant: "destructive"
      });
      return false;
    }

    // Check password match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!formData.location || formData.childrenAges.filter(age => age.trim()).length === 0) {
      toast({
        title: "Missing Information",
        description: "Please complete your family profile",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      // Create user account (email verification required)
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          user_type: 'client'
        }
      );

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message || 'Please try again.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Verify your email',
        description: 'We sent you a verification link. Please verify to continue.'
      });

      // Save profile preferences to context and database
      const profileData: ClientProfileData = {
        location: formData.location,
        numberOfChildren: formData.numberOfChildren,
        childrenAges: formData.childrenAges.filter(age => age.trim()),
        otherDependents: formData.otherDependents,
        petsInHome: formData.petsInHome,
        homeSize: formData.homeSize,
        specialNeeds: formData.specialNeeds,
        drivingSupport: formData.drivingSupport,
        cooking: formData.cooking,
        // Initialize other required fields with defaults
        ecdTraining: false,
        languages: "",
        montessori: false,
        schedule: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        },
        backupNanny: false
      };

      updatePreferences(profileData);

      // Save to database for persistence - use user ID from signup
      if (data?.user?.id) {
        const saveResult = await saveClientProfile(data.user.id, profileData);
        if (!saveResult.success) {
          console.error('Failed to save client profile:', saveResult.error);
          // Don't block signup, but log the error
        }
      }

      // After signup, require verification before proceeding
      navigate('/login');
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card className="rounded-xl royal-shadow border-border">
      <CardHeader>
        <CardTitle className="text-center text-foreground">Create Your Account</CardTitle>
        <p className="text-center text-muted-foreground">Step 1 of 2: Basic Information</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="First Name"
            value={formData.firstName}
            onChange={(e) => updateForm('firstName', e.target.value)}
            className="rounded-xl border-border focus:border-primary"
          />
          <Input
            placeholder="Last Name"
            value={formData.lastName}
            onChange={(e) => updateForm('lastName', e.target.value)}
            className="rounded-xl border-border focus:border-primary"
          />
        </div>

        <Input
          type="tel"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={(e) => updateForm('phone', e.target.value)}
          className="rounded-xl border-border focus:border-primary"
        />

        <div className="relative">
          <Input
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={(e) => {
              updateForm('email', e.target.value);
              const timeout = setTimeout(() => checkEmailAvailability(e.target.value), 500);
              return () => clearTimeout(timeout);
            }}
            className="rounded-xl border-border focus:border-primary pr-10"
          />
          {emailChecking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!emailChecking && emailAvailable === true && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check className="h-4 w-4 text-green-500" />
            </div>
          )}
          {!emailChecking && emailAvailable === false && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          )}
          {emailAvailable === false && (
            <p className="text-xs text-destructive mt-1">This email is already registered</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => {
                updateForm('password', e.target.value);
                calculatePasswordStrength(e.target.value);
              }}
              className="rounded-xl border-border focus:border-primary pr-10"
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
          {formData.password && (
            <PasswordStrengthIndicator password={formData.password} />
          )}
        </div>

        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => updateForm('confirmPassword', e.target.value)}
            className="rounded-xl border-border focus:border-primary pr-10"
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
          {formData.confirmPassword && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2">
              {formData.password === formData.confirmPassword ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          )}
        </div>
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}

        <Button
          onClick={handleNextStep}
          disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword || emailAvailable === false || formData.password !== formData.confirmPassword}
          className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="rounded-xl royal-shadow border-border">
      <CardHeader>
        <CardTitle className="text-center text-foreground">Family Profile</CardTitle>
        <p className="text-center text-muted-foreground">Step 2 of 2: Help us find the perfect match</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Address
          </label>
          <AddressAutocomplete
            value={formData.location}
            onChange={(address) => updateForm('location', address)}
            placeholder="Start typing your address..."
            className="rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
        </div>


        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Ages of children in the home
          </label>
          <div className="space-y-2">
            {formData.childrenAges.map((age, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="e.g., 3 years, 8 months"
                  value={age}
                  onChange={(e) => updateChildAge(index, e.target.value)}
                  className="rounded-xl border-primary/20 flex-1 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
                {formData.childrenAges.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChildAge(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addChildAge}
              className="w-full border-primary/20 text-primary hover:bg-primary/10 rounded-xl"
            >
              + Add Child Age
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Number of other dependents / occupants in home (including you)
          </label>
          <Select
            value={formData.otherDependents?.toString() || ""}
            onValueChange={(value) => updateForm('otherDependents', parseInt(value))}
          >
            <SelectTrigger className="rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-12">
              <SelectValue placeholder="How many other dependents or occupants?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5 or more</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Pets in home
          </label>
          <Select
            value={formData.petsInHome || ""}
            onValueChange={(value) => updateForm('petsInHome', value)}
          >
            <SelectTrigger className="rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-12">
              <SelectValue placeholder="Do you have any pets?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No pets</SelectItem>
              <SelectItem value="dogs">Dogs</SelectItem>
              <SelectItem value="cats">Cats</SelectItem>
              <SelectItem value="other">Other pets</SelectItem>
              <SelectItem value="multiple">Multiple types</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Size of home
          </label>
          <Select
            value={formData.homeSize || ""}
            onValueChange={(value) => updateForm('homeSize', value)}
          >
            <SelectTrigger className="rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 h-12">
              <SelectValue placeholder="Select your home size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pocket_palace">
                Pocket Palace (&lt;120m² of cosy 2 bedrooms, snug kitchen, living spot.)
              </SelectItem>
              <SelectItem value="family_hub">
                Family Hub (120m² - 200m², usually 3/4 snug bedrooms, kitchen, living &amp; dining)
              </SelectItem>
              <SelectItem value="grand_estate">
                Grand Estate (200m² - 300m², usually sprawling 3/4+ bedrooms, extra lounge or office, roomy kitchen)
              </SelectItem>
              <SelectItem value="monumental_manor">
                Monumental Manor (&gt;300m², usually palatial 5+ bedrooms, more lounges than you can count, gyms, libraries, and wings)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <h3 className="font-medium text-foreground mb-2">Additional support</h3>
            <p className="text-sm text-muted-foreground">
              Select additional services you need
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors">
              <span className="text-sm text-foreground font-medium">Diverse Ability support</span>
              <Switch
                checked={formData.specialNeeds}
                onCheckedChange={(checked) => updateForm('specialNeeds', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors">
              <span className="text-sm text-foreground font-medium">Driving support</span>
              <Switch
                checked={formData.drivingSupport}
                onCheckedChange={(checked) => updateForm('drivingSupport', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors">
              <span className="text-sm text-foreground font-medium">Food Prep</span>
              <Switch
                checked={formData.cooking}
                onCheckedChange={(checked) => updateForm('cooking', checked)}
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(1)}
            className="w-full border-primary/20 text-primary hover:bg-primary/10 rounded-xl"
          >
            Previous Step
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.location || formData.childrenAges.filter(age => age.trim()).length === 0}
            className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Complete Signup"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6">
      <div className="max-w-sm mx-auto w-full">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentStep === 1 ? navigate('/') : setCurrentStep(1)}
            className="text-primary hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex space-x-2">
            <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-secondary/20">
            <Heart className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Our Family</h1>
          <p className="text-muted-foreground">
            {currentStep === 1 ? "Create your account" : "Complete your family profile"}
          </p>
        </div>

        {currentStep === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
};

export default SignupWithProfile;
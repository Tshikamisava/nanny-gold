import { useState, useEffect } from 'react';
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
import { ArrowLeft, ArrowRight, Heart, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
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
  // Nanny preferences
  languages: string;
  childcareSupport: string[];
  householdSupport: string[];
  otherRequests: string;
}

const NewClientOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { updatePreferences } = useBooking();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
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
    // Nanny preferences
    languages: '',
    childcareSupport: [],
    householdSupport: [],
    otherRequests: '',
  });

  // Check if user already has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', user.id)
        .single();
        
      const { data: preferences } = await supabase
        .from('client_preferences')
        .select('*')
        .eq('client_id', user.id)
        .single();
        
      // If user has completed both profile and preferences, redirect to dashboard
      if (clientData?.home_size && preferences?.languages) {
        navigate('/dashboard');
      }
    };
    
    checkOnboardingStatus();
  }, [user, navigate]);

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

  const validateStep1 = () => {
    if (!formData.location || !formData.homeSize || formData.numberOfChildren === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.languages.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please specify preferred languages",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    if (!user) return;

    setLoading(true);
    
    try {
      // Save client profile
      const profileData: ClientProfileData = {
        numberOfChildren: formData.numberOfChildren,
        childrenAges: formData.childrenAges.filter(age => age.trim() !== ''),
        otherDependents: formData.otherDependents,
        petsInHome: formData.petsInHome,
        homeSize: formData.homeSize,
        location: formData.location,
        specialNeeds: formData.specialNeeds,
        ecdTraining: false,
        drivingSupport: formData.drivingSupport,
        cooking: formData.cooking,
        languages: formData.languages,
        additionalRequirements: formData.otherRequests
      };

      await saveClientProfile(user.id, profileData);

      // Save preferences to booking context and database
      await updatePreferences({
        location: formData.location,
        childrenAges: formData.childrenAges.filter(age => age.trim() !== ''),
        petsInHome: formData.petsInHome,
        homeSize: formData.homeSize,
        specialNeeds: formData.specialNeeds,
        drivingSupport: formData.drivingSupport,
        cooking: formData.cooking,
        languages: formData.languages,
        childcareSupport: formData.childcareSupport,
        householdSupport: formData.householdSupport,
      });

      toast({
        title: "Setup Complete!",
        description: "Your profile and preferences have been saved successfully.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleChildcareSupport = (value: string) => {
    setFormData(prev => ({
      ...prev,
      childcareSupport: prev.childcareSupport.includes(value)
        ? prev.childcareSupport.filter(item => item !== value)
        : [...prev.childcareSupport, value]
    }));
  };

  const toggleHouseholdSupport = (value: string) => {
    setFormData(prev => ({
      ...prev,
      householdSupport: prev.householdSupport.includes(value)
        ? prev.householdSupport.filter(item => item !== value)
        : [...prev.householdSupport, value]
    }));
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Family Profile</h2>
        <p className="text-muted-foreground text-sm mb-6">Tell us about your family to help us find the perfect match.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Location*</label>
          <AddressAutocomplete
            value={formData.location}
            onChange={(value) => updateForm('location', value)}
            placeholder="Enter your address"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Home Size*</label>
          <Select value={formData.homeSize} onValueChange={(value) => updateForm('homeSize', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select home size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pocket_palace">Pocket Palace (&lt;120m² - Cosy 2 bedrooms)</SelectItem>
              <SelectItem value="family_hub">Family Hub (120-200m² - Comfortable 3 bedrooms)</SelectItem>
              <SelectItem value="grand_estate">Grand Estate (200-350m² - Spacious 4 bedrooms)</SelectItem>
              <SelectItem value="monumental_manor">Monumental Manor (350-360m² - Luxurious 5 bedrooms)</SelectItem>
              <SelectItem value="epic_estates">Epic Estates (361m²+ - Grand luxury living)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Number of Children*</label>
          <Select value={formData.numberOfChildren.toString()} onValueChange={(value) => updateForm('numberOfChildren', parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select number of children" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.numberOfChildren > 0 && (
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Children's Ages</label>
            <div className="space-y-2">
              {formData.childrenAges.map((age, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={age}
                    onChange={(e) => updateChildAge(index, e.target.value)}
                    placeholder="Enter age (e.g. 3 years, 6 months)"
                    className="flex-1"
                  />
                  {formData.childrenAges.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeChildAge(index)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {formData.childrenAges.length < formData.numberOfChildren && (
                <Button variant="outline" onClick={addChildAge} className="w-full">
                  Add Another Child's Age
                </Button>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Other Dependents</label>
          <Select value={formData.otherDependents.toString()} onValueChange={(value) => updateForm('otherDependents', parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select number of other dependents" />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5].map(num => (
                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Pets in Home</label>
          <Select value={formData.petsInHome} onValueChange={(value) => updateForm('petsInHome', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Do you have pets?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No pets</SelectItem>
              <SelectItem value="dog">Dog</SelectItem>
              <SelectItem value="cat">Cat</SelectItem>
              <SelectItem value="multiple">Multiple pets</SelectItem>
              <SelectItem value="other">Other pets</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Nanny Preferences</h2>
        <p className="text-muted-foreground text-sm mb-6">Let us know what you're looking for in a nanny.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Preferred Languages*</label>
          <Input
            value={formData.languages}
            onChange={(e) => updateForm('languages', e.target.value)}
            placeholder="e.g., English, Afrikaans, Zulu"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">Childcare Support</label>
          <div className="space-y-3">
            {[
              { value: 'infant_care', label: 'Infant Care (0-12 months)' },
              { value: 'toddler_stimulation', label: 'Toddler Stimulation' },
              { value: 'potty_training', label: 'Potty Training' },
              { value: 'homework_supervision', label: 'Homework Supervision' },
              { value: 'school_prep', label: 'School Preparation' },
              { value: 'school_transport', label: 'School Transport' },
              { value: 'lunch_prep', label: 'Lunch Preparation' }
            ].map((item) => (
              <div key={item.value} className="flex items-center space-x-3">
                <Switch
                  checked={formData.childcareSupport.includes(item.value)}
                  onCheckedChange={() => toggleChildcareSupport(item.value)}
                />
                <label className="text-sm text-foreground">{item.label}</label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">Household Support</label>
          <div className="space-y-3">
            {[
              { value: 'food_prep', label: 'Food Preparation' },
              { value: 'housekeeping', label: 'Light Housekeeping' },
              { value: 'laundry', label: 'Laundry' },
              { value: 'grocery_shopping', label: 'Grocery Shopping' },
              { value: 'errands', label: 'Running Errands' },
              { value: 'pet_care', label: 'Pet Care' },
              { value: 'plant_care', label: 'Plant Care' },
              { value: 'admin_tasks', label: 'Administrative Tasks' }
            ].map((item) => (
              <div key={item.value} className="flex items-center space-x-3">
                <Switch
                  checked={formData.householdSupport.includes(item.value)}
                  onCheckedChange={() => toggleHouseholdSupport(item.value)}
                />
                <label className="text-sm text-foreground">{item.label}</label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Other Important Requests</label>
          <Input
            value={formData.otherRequests}
            onChange={(e) => updateForm('otherRequests', e.target.value)}
            placeholder="Any other specific requirements or preferences..."
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={currentStep === 1 ? () => navigate('/dashboard') : handleBack}
            className="text-primary hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex space-x-2">
            <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
          </div>
          <div className="w-10 h-10"> {/* Spacer for symmetry */}
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">NannyGold</span>
          </div>
        </div>

        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader>
            <CardTitle className="text-center text-foreground">
              {currentStep === 1 ? 'Family Profile' : 'Nanny Preferences'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 1 ? renderStep1() : renderStep2()}
            
            <div className="flex gap-4 mt-8">
              {currentStep === 2 && (
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              
              {currentStep === 1 ? (
                <Button 
                  onClick={handleNext}
                  className="flex-1 royal-gradient hover:opacity-90 text-white"
                  disabled={loading}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  className="flex-1 royal-gradient hover:opacity-90 text-white"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewClientOnboarding;
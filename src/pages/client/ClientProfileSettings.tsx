import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuthContext } from '@/components/AuthProvider';
import { ClientProfileData } from '@/services/clientProfileService';
import { useClientProfile, useProfileCompletion } from '@/hooks/useClientProfile';
import { User, Mail, Phone, MapPin, X, HelpCircle, Edit, Home, Users, Heart, Calendar, Loader2, Plus, GraduationCap, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import LanguageSelector from '@/components/LanguageSelector';
import { validateClientProfile, sanitizeChildrenAges, validateOtherDependents } from '@/utils/profileValidation';
export default function ClientProfileSettings() {
  const { user, loading: authLoading } = useAuthContext();
  const { profile, isLoading, saveProfile, isSaving, saveResult, forceRefetch } = useClientProfile();
  const { isComplete: isProfileComplete, completionPercentage } = useProfileCompletion();
  const { toast } = useToast();
  
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [profileData, setProfileData] = useState<ClientProfileData>({
    location: '',
    streetAddress: '',
    estateInfo: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    numberOfChildren: 0,
    childrenAges: [''],
    otherDependents: 0,
    petsInHome: '',
    homeSize: '',
    specialNeeds: false,
    ecdTraining: false,
    drivingSupport: false,
    cooking: false,
    languages: '',
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
  });

  // PHASE 4 FIX: Split useEffect into two separate effects to prevent dependency loops
  
  // Effect 1: Handle profile data updates when loaded from backend
  useEffect(() => {
    console.log('🔄 ClientProfileSettings: Profile update effect');
    
    // CRITICAL: Only update if NOT editing and NOT saving
    if (editingSection || isLocalSaving || isSaving) {
      console.log('⚠️ Skipping profile update - user is editing or saving');
      return;
    }
    
    // Update from profile when available
    if (profile) {
      console.log('✅ Setting profile data from loaded profile');
      // Ensure we always have at least one empty age field
      if (!profile.childrenAges || profile.childrenAges.length === 0) {
        profile.childrenAges = [''];
      }
      setProfileData(profile);
      console.log('✅ Profile data successfully set in component state');
    }
  }, [profile, isLoading]); // REDUCED dependencies - only profile and isLoading

  // Effect 2: Handle initial fetch on component mount
  useEffect(() => {
    console.log('🚀 ClientProfileSettings: Initial fetch effect');
    
    if (user?.id && !profile && !isLoading) {
      console.log('🔄 Forcing initial data fetch...');
      forceRefetch();
    }
  }, [user?.id]); // ONLY depend on user ID
  const updateProfileData = (field: keyof ClientProfileData, value: any, sectionName?: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));

    // Mark section as having changes
    if (sectionName && editingSection === sectionName) {
      setHasChanges(prev => ({
        ...prev,
        [sectionName]: true
      }));
    }
  };
  const handleSectionEdit = (sectionName: string) => {
    setEditingSection(sectionName);
    setHasChanges(prev => ({
      ...prev,
      [sectionName]: false
    }));
  };
  const handleSectionSave = async (sectionName: string) => {
    // Don't save if no changes or already saving
    if (!hasChanges[sectionName] || isLocalSaving || isSaving) {
      setEditingSection(null);
      return;
    }
    
    await handleSaveProfile();
    setEditingSection(null);
    setHasChanges(prev => ({
      ...prev,
      [sectionName]: false
    }));
  };
  const addChildAge = () => {
    console.log('➕ Adding new child age field');
    setProfileData(prev => {
      const newChildrenAges = [...prev.childrenAges, ''];
      console.log('👶 Updated children ages:', newChildrenAges);
      return {
        ...prev,
        childrenAges: newChildrenAges
      };
    });
    if (editingSection === 'family') {
      setHasChanges(prev => ({
        ...prev,
        family: true
      }));
    }
  };
  
  const updateChildAge = (index: number, age: string) => {
    console.log(`✏️ Updating child age at index ${index} to:`, age);
    setProfileData(prev => {
      const newChildrenAges = prev.childrenAges.map((a, i) => i === index ? age : a);
      console.log('👶 Updated children ages:', newChildrenAges);
      return {
        ...prev,
        childrenAges: newChildrenAges
      };
    });
    if (editingSection === 'family') {
      setHasChanges(prev => ({
        ...prev,
        family: true
      }));
    }
  };
  
  const removeChildAge = (index: number) => {
    if (profileData.childrenAges.length > 1) {
      console.log(`🗑️ Removing child age at index ${index}`);
      setProfileData(prev => {
        const newChildrenAges = prev.childrenAges.filter((_, i) => i !== index);
        console.log('👶 Updated children ages:', newChildrenAges);
        return {
          ...prev,
          childrenAges: newChildrenAges
        };
      });
      if (editingSection === 'family') {
        setHasChanges(prev => ({
          ...prev,
          family: true
        }));
      }
    } else {
      console.log('⚠️ Cannot remove last child age field');
    }
  };
  
  const updateOtherDependents = (value: string) => {
    const numericValue = Math.max(0, parseInt(value) || 0);
    console.log('👥 Updating other dependents to:', numericValue);
    setProfileData(prev => ({
      ...prev,
      otherDependents: numericValue
    }));
    if (editingSection === 'family') {
      setHasChanges(prev => ({
        ...prev,
        family: true
      }));
    }
  };

  const handleSaveProfile = async () => {
    console.log('💾 [ClientProfileSettings] Manual save from user');
    console.log('📊 Profile data being saved:', profileData);
    
    // CRITICAL: Check if we're about to wipe existing address data
    if (profile && profile.city && !profileData.city?.trim()) {
      const confirmed = window.confirm(
        "⚠️ You haven't entered an address. This will remove your existing address information.\n\nAre you sure you want to continue?"
      );
      if (!confirmed) {
        console.log('❌ User cancelled save to prevent address wipe');
        return;
      }
    }
    
    // Set local saving state to prevent cache overwrites
    setIsLocalSaving(true);
    
    try {
      // Validate profile data before saving
      const validation = validateClientProfile(profileData);
      
      // Log warnings but DON'T show toast - prevents confusion before save
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Profile has incomplete fields:', validation.warnings);
        // Don't show warning toast - let save succeed and show success message only
      }
      
      // Only block on true errors (like invalid data formats)
      if (!validation.isValid) {
        console.error('❌ Profile validation failed:', validation.errors);
        toast({
          title: "Validation Error",
          description: validation.errors[0] || "Please check your profile information",
          variant: "destructive"
        });
        setIsLocalSaving(false);
        return;
      }
      
      // Clean data before saving
      const cleanedData = {
        ...profileData,
        // Sanitize phone: remove all spaces and trim
        phone: profileData.phone?.replace(/\s+/g, '').trim() || '',
        childrenAges: sanitizeChildrenAges(profileData.childrenAges),
        otherDependents: validateOtherDependents(profileData.otherDependents)
      };
      
      console.log('🧹 Cleaned profile data:', cleanedData);
      
      // Update local state with cleaned data (optimistic update)
      setProfileData(cleanedData);
      
      // Show completion message based on profile completeness
      if (isProfileComplete) {
        console.log('✨ Profile is complete');
      }
      
      // Save to backend
      saveProfile(cleanedData);
      
      // Wait for save to complete
      setTimeout(() => {
        setIsLocalSaving(false);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      setIsLocalSaving(false);
    }
  };

  // Show loading state while auth is being determined
  if (authLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading...</h1>
          <p className="text-muted-foreground">Checking authentication status...</p>
        </div>
      </div>;
  }

  // Check if user is authenticated only after auth loading is complete
  if (!user) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Authentication Required</h1>
          <p className="text-muted-foreground">Please log in to access your profile settings.</p>
        </div>
      </div>;
  }
  if (isLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6" role="status" aria-live="polite">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile Settings</h1>
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and account preferences.
          </p>
        </div>

        {/* Personal Information Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </div>
              </div>
              <Button variant={editingSection === 'personal' ? "secondary" : "outline"} size="sm" onClick={() => handleSectionEdit('personal')} disabled={editingSection === 'personal'} className="w-full sm:w-auto">
                <Edit className="w-4 h-4 mr-2" />
                {editingSection === 'personal' ? 'Editing' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <Input id="firstName" placeholder="Enter your first name" value={profileData.firstName || ''} onChange={e => updateProfileData('firstName', e.target.value, 'personal')} disabled={editingSection !== 'personal'} className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <Input id="lastName" placeholder="Enter your last name" value={profileData.lastName || ''} onChange={e => updateProfileData('lastName', e.target.value, 'personal')} disabled={editingSection !== 'personal'} className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </Label>
                <Input id="email" type="email" value={user?.email || ''} disabled className="h-11 rounded-xl bg-muted/50 border-muted" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input id="phone" placeholder="e.g., 0831234567 (no spaces)" value={profileData.phone || ''} onChange={e => updateProfileData('phone', e.target.value, 'personal')} disabled={editingSection !== 'personal'} className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            
            {/* Address Section */}
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Address Information
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="streetAddress" className="text-xs text-muted-foreground">Street Address</Label>
                  <Input id="streetAddress" placeholder="e.g., 123 Main Street" value={profileData.streetAddress || ''} onChange={e => updateProfileData('streetAddress', e.target.value, 'personal')} disabled={editingSection !== 'personal'} className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estateInfo" className="text-xs text-muted-foreground">Estate Name & Home Number</Label>
                  <Input id="estateInfo" placeholder="e.g., Sunset Estate, Unit 5A" value={profileData.estateInfo || ''} onChange={e => updateProfileData('estateInfo', e.target.value, 'personal')} disabled={editingSection !== 'personal'} className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suburb" className="text-xs text-muted-foreground">Suburb</Label>
                  <Input id="suburb" placeholder="e.g., Sandton" value={profileData.suburb || ''} onChange={e => updateProfileData('suburb', e.target.value, 'personal')} disabled={editingSection !== 'personal'} className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                  <Select value={profileData.city || ""} onValueChange={value => updateProfileData('city', value, 'personal')} disabled={editingSection !== 'personal'}>
                    <SelectTrigger className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Johannesburg">Johannesburg</SelectItem>
                      <SelectItem value="Cape Town">Cape Town</SelectItem>
                      <SelectItem value="Durban">Durban</SelectItem>
                      <SelectItem value="Pretoria">Pretoria</SelectItem>
                      <SelectItem value="Port Elizabeth">Port Elizabeth</SelectItem>
                      <SelectItem value="Bloemfontein">Bloemfontein</SelectItem>
                      <SelectItem value="East London">East London</SelectItem>
                      <SelectItem value="Pietermaritzburg">Pietermaritzburg</SelectItem>
                      <SelectItem value="Nelspruit">Nelspruit</SelectItem>
                      <SelectItem value="Kimberley">Kimberley</SelectItem>
                      <SelectItem value="Polokwane">Polokwane</SelectItem>
                      <SelectItem value="Rustenburg">Rustenburg</SelectItem>
                      <SelectItem value="Witbank">Witbank</SelectItem>
                      <SelectItem value="Vereeniging">Vereeniging</SelectItem>
                      <SelectItem value="Welkom">Welkom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province" className="text-xs text-muted-foreground">Province</Label>
                  <Select value={profileData.province || ""} onValueChange={value => updateProfileData('province', value, 'personal')} disabled={editingSection !== 'personal'}>
                    <SelectTrigger className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gauteng">Gauteng</SelectItem>
                      <SelectItem value="western-cape">Western Cape</SelectItem>
                      <SelectItem value="kwazulu-natal">KwaZulu-Natal</SelectItem>
                      <SelectItem value="eastern-cape">Eastern Cape</SelectItem>
                      <SelectItem value="free-state">Free State</SelectItem>
                      <SelectItem value="limpopo">Limpopo</SelectItem>
                      <SelectItem value="mpumalanga">Mpumalanga</SelectItem>
                      <SelectItem value="north-west">North West</SelectItem>
                      <SelectItem value="northern-cape">Northern Cape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-xs text-muted-foreground">Postal Code</Label>
                  <Input id="postalCode" placeholder="e.g., 2196" value={profileData.postalCode || ''} onChange={e => updateProfileData('postalCode', e.target.value, 'personal')} disabled={editingSection !== 'personal'} className="h-11 rounded-xl border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </div>
            
            {editingSection === 'personal' && hasChanges.personal && (
              <Button 
                onClick={() => handleSectionSave('personal')} 
                disabled={isSaving} 
                className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium shadow-lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Family Information Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-secondary/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Family Information</CardTitle>
                  <CardDescription>
                    Tell us about your family and childcare needs
                  </CardDescription>
                </div>
              </div>
              <Button variant={editingSection === 'family' ? "secondary" : "outline"} size="sm" onClick={() => handleSectionEdit('family')} disabled={editingSection === 'family'} className="w-full sm:w-auto">
                <Edit className="w-4 h-4 mr-2" />
                {editingSection === 'family' ? 'Editing' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Children Ages */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Ages of children in the home
              </Label>
              <div className="space-y-3">
                {profileData.childrenAges.map((age, index) => <div key={index} className="flex items-center gap-3">
                  <Input type="text" placeholder="e.g., 3 years, 8 months" value={age} onChange={e => {
                    if (editingSection !== 'family') {
                      handleSectionEdit('family');
                    }
                    updateChildAge(index, e.target.value);
                  }} className="h-11 rounded-xl border-secondary/20 focus:border-secondary/40 focus:ring-2 focus:ring-secondary/20 flex-1" />
                    {profileData.childrenAges.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => {
                      if (editingSection !== 'family') {
                        handleSectionEdit('family');
                      }
                      removeChildAge(index);
                    }} className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <X className="w-4 h-4" />
                      </Button>}
                  </div>)}
                <Button type="button" variant="outline" onClick={() => {
                  if (editingSection !== 'family') {
                    handleSectionEdit('family');
                  }
                  addChildAge();
                }} className="w-full h-11 border-secondary/20 text-secondary hover:bg-secondary/10 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Child Age
                </Button>
              </div>
            </div>

            {/* Other Dependents */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Number of other dependents / occupants in home (including you)
              </Label>
              <Select value={profileData.otherDependents?.toString() || ""} onValueChange={(value) => {
                if (editingSection !== 'family') {
                  handleSectionEdit('family');
                }
                updateOtherDependents(value);
              }}>
                <SelectTrigger className="h-11 rounded-xl border-secondary/20 focus:border-secondary/40 focus:ring-2 focus:ring-secondary/20">
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

            {/* Pets in Home */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Pets in home
              </Label>
              <Select value={profileData.petsInHome || ""} onValueChange={value => updateProfileData('petsInHome', value, 'family')} disabled={editingSection !== 'family'}>
                <SelectTrigger className="h-11 rounded-xl border-secondary/20 focus:border-secondary/40 focus:ring-2 focus:ring-secondary/20">
                  <SelectValue placeholder="Do you have any pets?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No pets</SelectItem>
                  <SelectItem value="dogs">Dogs</SelectItem>
                  <SelectItem value="cats">Cats</SelectItem>
                  <SelectItem value="both">Both dogs and cats</SelectItem>
                  <SelectItem value="other">Other pets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Home Size */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Home size
              </Label>
              <Select 
                value={(() => {
                  // Return database enum values directly
                  const homeSize = profileData.homeSize || "";
                  if (['pocket_palace', 'family_hub', 'grand_estate', 'monumental_manor'].includes(homeSize.toLowerCase())) {
                    return homeSize.toLowerCase();
                  }
                  // Legacy conversion for backward compatibility
                  if (homeSize.includes("Pocket Palace") || homeSize === "small") return "pocket_palace";
                  if (homeSize.includes("Family Hub") || homeSize === "medium") return "family_hub";
                  if (homeSize.includes("Grand") || homeSize === "large") return "grand_estate";
                  if (homeSize.includes("Manor") || homeSize.includes("Epic") || homeSize === "monumental") return "monumental_manor";
                  return homeSize;
                })()} 
                onValueChange={value => updateProfileData('homeSize', value, 'family')} 
                disabled={editingSection !== 'family'}
              >
                <SelectTrigger className="h-11 rounded-xl border-secondary/20 focus:border-secondary/40 focus:ring-2 focus:ring-secondary/20">
                  <SelectValue placeholder="Select your home size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pocket_palace">Pocket Palace (&lt;120m² of cosy 2 bedrooms, snug kitchen, living spot.)</SelectItem>
                  <SelectItem value="family_hub">Family Hub (120m² - 200m², usually 3/4 snug bedrooms, kitchen, living & dining)</SelectItem>
                  <SelectItem value="grand_estate">Grand Estate (200m² - 350m², usually sprawling 3/4+ bedrooms, extra lounge or office, roomy kitchen)</SelectItem>
                  <SelectItem value="monumental_manor">Monumental Manor (350m² - 360m², usually palatial 5+ bedrooms, more lounges than you can count)</SelectItem>
                  <SelectItem value="epic_estates">Epic Estates (361m²+ - Grand luxury living with oversized rooms, elegant spaces, and elite amenities)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editingSection === 'family' && hasChanges.family && (
              <Button 
                onClick={() => handleSectionSave('family')} 
                disabled={isSaving} 
                className="w-full h-11 rounded-xl bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-white font-medium shadow-lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Nanny Preferences Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Nanny Preferences</CardTitle>
                  <CardDescription>
                    Tell us what you're looking for in a nanny
                  </CardDescription>
                </div>
              </div>
              <Button variant={editingSection === 'preferences' ? "secondary" : "outline"} size="sm" onClick={() => handleSectionEdit('preferences')} disabled={editingSection === 'preferences'} className="w-full sm:w-auto">
                <Edit className="w-4 h-4 mr-2" />
                {editingSection === 'preferences' ? 'Editing' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Professional Qualifications Banner */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Professional Standards</h4>
                  <p className="text-sm text-muted-foreground">
                    All our nannies are ECD trained and have First Aid training
                  </p>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Preferred languages
              </Label>
              <LanguageSelector 
                selectedLanguages={profileData.languages || ''} 
                onChange={(languages) => updateProfileData('languages', languages, 'preferences')} 
                disabled={editingSection !== 'preferences'}
              />
            </div>

            {/* Services Grid */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Label className="text-sm font-medium">
                  Additional services needed
                </Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>All our nannies are trained in ECD (Early Childhood Development), First Aid, and light housekeeping. Select additional services if you need them.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl border border-accent/20 bg-accent/5">
                  <div>
                    <Label htmlFor="cooking" className="text-sm font-medium cursor-pointer">Cooking</Label>
                    <p className="text-xs text-muted-foreground">Meal preparation for the family</p>
                  </div>
                  <Switch id="cooking" checked={profileData.cooking || false} onCheckedChange={value => updateProfileData('cooking', value, 'preferences')} disabled={editingSection !== 'preferences'} />
                </div>
                
                <div className="relative flex items-center justify-between p-3 rounded-xl border border-muted/40 bg-muted/10 opacity-75">
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Coming Soon
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        Driving Support
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>We're expanding our network of driving nannies. This premium service will be available soon!</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <p className="text-xs text-muted-foreground">School runs & activities</p>
                    </div>
                  </div>
                  <Switch checked={false} disabled={true} className="opacity-50" />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl border border-accent/20 bg-accent/5">
                  <div>
                    <Label htmlFor="specialNeeds" className="text-sm font-medium cursor-pointer">Diverse Ability Care</Label>
                    <p className="text-xs text-muted-foreground">Experience with diverse ability needs </p>
                  </div>
                  <Switch id="specialNeeds" checked={profileData.specialNeeds || false} onCheckedChange={value => updateProfileData('specialNeeds', value, 'preferences')} disabled={editingSection !== 'preferences'} />
                </div>
                
                
                
                
                
                <div className="flex items-center justify-between p-3 rounded-xl border border-accent/20 bg-accent/5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="backupNanny" className="text-sm font-medium cursor-pointer">Backup Nanny</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>If your selected nanny becomes unavailable, we'll automatically find you a qualified backup nanny within 24 hours. This ensures your childcare needs are always covered.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch id="backupNanny" checked={profileData.backupNanny || false} onCheckedChange={value => updateProfileData('backupNanny', value, 'preferences')} disabled={editingSection !== 'preferences'} />
                </div>
              </div>
            </div>

            
            {editingSection === 'preferences' && hasChanges.preferences && (
              <Button 
                onClick={() => handleSectionSave('preferences')} 
                disabled={isSaving} 
                className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium shadow-lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Save All Button */}
        {!editingSection && (
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving} 
              size="lg" 
              className="w-full max-w-md h-12 rounded-xl bg-gradient-to-r from-primary via-primary to-secondary hover:from-primary/90 hover:via-primary/90 hover:to-secondary/90 text-white font-medium shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                "Save All Changes"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>;
}
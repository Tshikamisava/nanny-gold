import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Star, MapPin, Phone, Mail, Edit, Camera, FileText, Award, BookOpen, Clock, Medal, Check, X, Send, Loader2, AlertCircle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DocumentUpload from '@/components/DocumentUpload';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import PhotoUploadDialog from '@/components/PhotoUploadDialog';
import VerificationStatusDialog from '@/components/VerificationStatusDialog';
import VerificationProgressCard from '@/components/VerificationProgressCard';
import { useProfileSubmission } from '@/hooks/useProfileSubmission';
import {
  AVAILABLE_LANGUAGES,
  AVAILABLE_SKILLS,
  EXPERIENCE_LEVELS,
} from '@/constants/nannyOptions';

interface NannyProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  experience_level?: string | null;
  languages?: string[] | null;
  skills?: string[] | null;
  hourly_rate?: number | null;
  monthly_rate?: number | null;
  avatar_url?: string | null;
}

// Constants are now imported from @/constants/nannyOptions

export default function NannyProfile() {
  const [profile, setProfile] = useState<NannyProfile>({});
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>({});
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const { 
    isSubmitting, 
    hasChanges, 
    setHasChanges, 
    documentValidation, 
    checkDocumentValidation,
    submitProfile 
  } = useProfileSubmission();

  useEffect(() => {
    // Only reload profile if there are no unsaved changes
    if (!hasUnsavedChanges) {
      loadProfile();
    }
  }, []);

  // Prevent data loss when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadProfile = async () => {
    try {
      console.log('🔄 Loading nanny profile...');
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single();

      if (profileError) {
        console.error('❌ Error loading profile data:', profileError);
      }

      // Load nanny data
      const { data: nannyData, error: nannyError } = await supabase
        .from('nannies')
        .select('*')
        .eq('id', user.user.id)
        .single();

      if (nannyError) {
        console.log('⚠️ Nanny data not found, user may need to complete profile setup');
      }

      const combinedProfile: NannyProfile = {
        ...profileData,
        ...nannyData
      };

      console.log('✅ Profile loaded successfully:', combinedProfile);
      setProfile(combinedProfile);
    } catch (error) {
      console.error('❌ Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (section: string, data: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      console.log('🔄 Updating profile section:', section, 'with data:', data);

      // Update profiles table
      if (['first_name', 'last_name', 'email', 'phone', 'location', 'avatar_url'].includes(section)) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(data)
          .eq('id', user.user.id);
        
        if (profileError) {
          console.error('❌ Error updating profiles table:', profileError);
          throw profileError;
        }
        console.log('✅ Profiles table updated successfully');
      }

      // Update nannies table
      if (['bio', 'experience_level', 'languages', 'skills', 'hourly_rate', 'monthly_rate'].includes(section)) {
        const { error: nannyError } = await supabase
          .from('nannies')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', user.user.id);
        
        if (nannyError) {
          console.error('❌ Error updating nannies table:', nannyError);
          throw nannyError;
        }
        console.log('✅ Nannies table updated successfully');
      }

      // Update local state
      setProfile(prev => ({ ...prev, ...data }));
      setEditingSection(null);
      setHasChanges(true); // Mark that changes were made
      checkDocumentValidation(); // Recheck validation after profile changes
      
      toast({ title: "Profile updated successfully" });
      
      // Reload profile to ensure consistency with database
      setTimeout(() => {
        console.log('🔄 Reloading profile to verify changes...');
        loadProfile();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      toast({ 
        title: "Error updating profile", 
        description: "Your changes may not have been saved. Please try again.",
        variant: "destructive" 
      });
    }
  };

  // Helper function to detect changes in tempData
  const detectChanges = (original: any, current: any) => {
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  const startEdit = (section: string, currentData: any) => {
    setEditingSection(section);
    setTempData(currentData);
    setHasUnsavedChanges(false); // Reset flag when starting to edit
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setTempData({});
    setHasUnsavedChanges(false); // Reset flag when canceling
  };

  const saveEdit = (section: string) => {
    setHasUnsavedChanges(false); // Clear flag before saving
    updateProfile(section, tempData);
  };

  // Track changes in form fields
  const handleFieldChange = (field: string, value: any, originalData: any) => {
    const newTempData = { ...tempData, [field]: value };
    setTempData(newTempData);
    
    // Check if there are actual changes
    const hasChanges = detectChanges(originalData, newTempData);
    setHasUnsavedChanges(hasChanges);
  };

  const handlePhotoUploaded = (url: string) => {
    setProfile(prev => ({ ...prev, avatar_url: url }));
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your profile information and settings
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg md:text-xl">
            Profile Information
            {editingSection !== 'profile' && (
              <Button variant="outline" size="sm" onClick={() => startEdit('profile', {
                first_name: profile.first_name || '',
                last_name: profile.last_name || ''
              })}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingSection === 'profile' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={tempData.first_name || ''}
                    onChange={(e) => handleFieldChange('first_name', e.target.value, {
                      first_name: profile.first_name || '',
                      last_name: profile.last_name || ''
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={tempData.last_name || ''}
                    onChange={(e) => handleFieldChange('last_name', e.target.value, {
                      first_name: profile.first_name || '',
                      last_name: profile.last_name || ''
                    })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveEdit('profile')} size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={cancelEdit} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-r from-fuchsia-200 to-pink-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log(' Nanny profile image failed to load:', e.currentTarget.src);
                        // Fallback to placeholder if image fails to load
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 md:w-12 md:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <User className="w-8 h-8 md:w-12 md:h-12 text-fuchsia-700" />
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="absolute -bottom-1 -right-1 h-6 w-6 md:h-8 md:w-8 rounded-full p-0 z-10 bg-white shadow-md"
                  onClick={() => setPhotoDialogOpen(true)}
                >
                  <Camera className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-semibold">
                  {profile.first_name && profile.last_name 
                    ? `${profile.first_name} ${profile.last_name}` 
                    : 'Please add your name'}
                </h3>
                <p className="text-muted-foreground mb-2 text-sm md:text-base">Professional Nanny</p>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mb-3">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    <span className="truncate">{profile.location || 'Add address'}</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-3 h-3 md:w-4 md:h-4 mr-1 text-yellow-500" />
                    <span>0.0 (0 reviews)</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {EXPERIENCE_LEVELS.find(e => e.value === profile.experience_level)?.label || '1-3 years experience'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">Available</Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg md:text-xl">
            Contact Information
            {editingSection !== 'contact' && (
              <Button variant="outline" size="sm" onClick={() => startEdit('contact', {
                email: profile.email || '',
                phone: profile.phone || '',
                location: profile.location || ''
              })}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingSection === 'contact' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={tempData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value, {
                    email: profile.email || '',
                    phone: profile.phone || '',
                    location: profile.location || ''
                  })}
                />
              </div>
              <div>
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  placeholder="+27 XX XXX XXXX"
                  value={tempData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value, {
                    email: profile.email || '',
                    phone: profile.phone || '',
                    location: profile.location || ''
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Please provide your WhatsApp number for easy communication
                </p>
              </div>
              <div>
                <Label htmlFor="location">Address</Label>
                <AddressAutocomplete
                  value={tempData.location || ''}
                  onChange={(address) => handleFieldChange('location', address, {
                    email: profile.email || '',
                    phone: profile.phone || '',
                    location: profile.location || ''
                  })}
                  placeholder="Enter your address"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveEdit('contact')} size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={cancelEdit} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-sm md:text-base truncate">
                    {profile.email || 'Please add your email'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground">WhatsApp Number</p>
                  <p className="font-medium text-sm md:text-base">
                    {profile.phone || 'Please add your WhatsApp number'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground">Address</p>
                  <p className="font-medium text-sm md:text-base">
                    {profile.location || 'Please add your address'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience & Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg md:text-xl">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Experience & Skills
            </div>
            {editingSection !== 'experience' && (
              <Button variant="outline" size="sm" onClick={() => startEdit('experience', {
                experience_level: profile.experience_level || '1-3',
                languages: profile.languages || ['English'],
                skills: profile.skills || ['Childcare']
              })}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingSection === 'experience' ? (
            <div className="space-y-6">
              <div>
                <Label htmlFor="experience_level">Experience Level</Label>
                <Select
                  value={tempData.experience_level || ''}
                  onValueChange={(value) => handleFieldChange('experience_level', value, {
                    experience_level: profile.experience_level || '1-3',
                    languages: profile.languages || ['English'],
                    skills: profile.skills || ['Childcare']
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <Button
                      key={lang}
                      variant={tempData.languages?.includes(lang) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentLangs = tempData.languages || [];
                        const newLangs = currentLangs.includes(lang)
                          ? currentLangs.filter(l => l !== lang)
                          : [...currentLangs, lang];
                        handleFieldChange('languages', newLangs, {
                          experience_level: profile.experience_level || '1-3',
                          languages: profile.languages || ['English'],
                          skills: profile.skills || ['Childcare']
                        });
                      }}
                    >
                      {lang}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Core Skills</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_SKILLS.map((skill) => (
                    <Button
                      key={skill}
                      variant={tempData.skills?.includes(skill) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentSkills = tempData.skills || [];
                        const newSkills = currentSkills.includes(skill)
                          ? currentSkills.filter(s => s !== skill)
                          : [...currentSkills, skill];
                        handleFieldChange('skills', newSkills, {
                          experience_level: profile.experience_level || '1-3',
                          languages: profile.languages || ['English'],
                          skills: profile.skills || ['Childcare']
                        });
                      }}
                    >
                      {skill}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveEdit('experience')} size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={cancelEdit} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div>
                <h4 className="font-medium mb-3 text-sm md:text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Experience Level
                </h4>
                <Badge variant="secondary" className="text-sm">
                  {EXPERIENCE_LEVELS.find(e => e.value === profile.experience_level)?.label || '1-3 years experience'}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm md:text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Languages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.languages || ['English']).map((lang) => (
                    <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm md:text-base flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Core Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.skills || ['Childcare']).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm md:text-base flex items-center gap-2">
                  <Medal className="w-4 h-4" />
                  Certifications
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Upload documents below to automatically add certifications</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg md:text-xl">
            About Me
            {editingSection !== 'bio' && (
              <Button variant="outline" size="sm" onClick={() => startEdit('bio', {
                bio: profile.bio || ''
              })}>
                <Edit className="w-4 h-4 mr-2" />
                {profile.bio ? 'Edit Bio' : 'Add Bio'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingSection === 'bio' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">Tell families about yourself</Label>
                <Textarea
                  id="bio"
                  placeholder="Share your story, experience, and what makes you a great nanny..."
                  className="min-h-[120px]"
                  value={tempData.bio || ''}
                  onChange={(e) => handleFieldChange('bio', e.target.value, {
                    bio: profile.bio || ''
                  })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveEdit('bio')} size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={cancelEdit} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : profile.bio ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{profile.bio}</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4 text-sm md:text-base">Share your story and experience with potential families</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Progress */}
      <VerificationProgressCard />

      {/* Document Upload */}
      <DocumentUpload />

      {/* Profile Submission */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">Submit Profile for Review</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete all required sections and upload necessary documents to submit your profile for admin approval.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Document Status */}
            {!documentValidation.hasRequiredDocuments && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-900 mb-2">Required Documents Missing</h4>
                    <p className="text-sm text-orange-800 mb-2">Please upload the following documents:</p>
                    <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                      {documentValidation.missingDocuments.map((doc) => (
                        <li key={doc}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected Documents */}
            {documentValidation.hasRejectedDocuments && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Documents Need Re-upload</h4>
                    <p className="text-sm text-red-800 mb-2">The following documents were rejected and need to be re-uploaded:</p>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      {documentValidation.rejectedDocuments.map((doc) => (
                        <li key={doc}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setVerificationDialogOpen(true)}
                >
                  <Shield className="w-4 h-4" />
                  Check verification status
                </Button>
              </div>
              
              {hasChanges && (
                <Button 
                  onClick={submitProfile}
                  disabled={!documentValidation.canSubmit || isSubmitting}
                  className={`gap-2 ${
                    !documentValidation.canSubmit 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit for Review
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload Dialog */}
      <PhotoUploadDialog
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
        onPhotoUploaded={handlePhotoUploaded}
        currentPhotoUrl={profile.avatar_url}
      />

      {/* Verification Status Dialog */}
      <VerificationStatusDialog
        open={verificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
      />
    </div>
  );
}
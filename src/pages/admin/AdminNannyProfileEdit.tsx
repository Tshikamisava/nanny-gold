import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, User, Award, FileText, CheckCircle, XCircle, Clock, Camera, Mail, Phone, MapPin } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import PhotoUploadDialog from '@/components/PhotoUploadDialog';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORIES_GROUPED,
  ADMIN_CATEGORIES,
  AVAILABLE_LANGUAGES,
  AVAILABLE_SKILLS,
  AVAILABLE_CERTIFICATIONS,
} from '@/constants/nannyOptions';

interface NannyProfile {
  id: string;
  bio: string;
  experience_level: string;
  hourly_rate: number | null;
  languages: string[];
  skills: string[];
  certifications: string[];
  approval_status: string;
  is_verified: boolean;
  is_available: boolean;
  can_receive_bookings: boolean;
  service_categories: string[];
  admin_assigned_categories: string[];
  admin_notes: string;
  verification_status: string;
  interview_status: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    location: string;
    avatar_url?: string;
  };
}

const AdminNannyProfileEdit = () => {
  const { nannyId } = useParams<{ nannyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [nanny, setNanny] = useState<NannyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  
  const [formData, setFormData] = useState({
    bio: '',
    experience_level: '',
    hourly_rate: '',
    languages: [] as string[],
    skills: [] as string[],
    certifications: [] as string[],
    approval_status: '',
    is_verified: false,
    is_available: false,
    can_receive_bookings: false,
    service_categories: [] as string[],
    admin_assigned_categories: [] as string[],
    admin_notes: ''
  });

  useEffect(() => {
    loadNannyProfile();
  }, [nannyId]);

  const loadNannyProfile = async () => {
    if (!nannyId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('nannies')
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email,
            phone,
            location,
            avatar_url
          )
        `)
        .eq('id', nannyId)
        .single();

      if (error) throw error;

      setNanny(data);
      setFormData({
        bio: data.bio || '',
        experience_level: data.experience_level || '1-3',
        hourly_rate: data.hourly_rate?.toString() || '',
        languages: data.languages || [],
        skills: data.skills || [],
        certifications: data.certifications || [],
        approval_status: data.approval_status || 'pending',
        is_verified: data.is_verified || false,
        is_available: data.is_available || false,
        can_receive_bookings: data.can_receive_bookings || false,
        service_categories: data.service_categories || [],
        admin_assigned_categories: data.admin_assigned_categories || [],
        admin_notes: data.admin_notes || ''
      });
    } catch (error) {
      console.error('Error loading nanny profile:', error);
      toast({
        title: "Error",
        description: "Failed to load nanny profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nannyId) return;
    
    try {
      setSaving(true);
      
      const updateData = {
        bio: formData.bio,
        experience_level: formData.experience_level as "1-3" | "3-6" | "6+",
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        languages: formData.languages,
        skills: formData.skills,
        certifications: formData.certifications,
        approval_status: formData.approval_status,
        is_verified: formData.is_verified,
        is_available: formData.is_available,
        can_receive_bookings: formData.can_receive_bookings,
        service_categories: formData.service_categories,
        admin_assigned_categories: formData.admin_assigned_categories,
        admin_notes: formData.admin_notes,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('nannies')
        .update(updateData)
        .eq('id', nannyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Nanny profile updated successfully"
      });
      
      // Reload profile to get updated data and force refresh
      await loadNannyProfile();
      
      // Force a small delay to ensure database consistency
      setTimeout(() => {
        loadNannyProfile();
      }, 500);
      
    } catch (error) {
      console.error('Error updating nanny profile:', error);
      toast({
        title: "Error",
        description: "Failed to update nanny profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUploaded = async (url: string) => {
    try {
      // Update the profile avatar in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', nannyId);

      if (error) throw error;

      // Update local state
      if (nanny) {
        setNanny(prev => prev ? {
          ...prev,
          profiles: {
            ...prev.profiles,
            avatar_url: url
          }
        } : null);
      }

      toast({
        title: "Success",
        description: "Profile photo updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile photo:', error);
      toast({
        title: "Error",
        description: "Failed to update profile photo",
        variant: "destructive"
      });
    }
  };

  const handleServiceToggle = (service: string, checked: boolean) => {
    const currentCategories = formData.service_categories || [];
    
    if (checked) {
      if (!currentCategories.includes(service)) {
        setFormData(prev => ({
          ...prev,
          service_categories: [...currentCategories, service]
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        service_categories: currentCategories.filter(cat => cat !== service)
      }));
    }
  };

  const handleArrayFieldChange = (field: 'languages' | 'skills' | 'certifications' | 'service_categories' | 'admin_assigned_categories', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!nanny) {
    return (
      <div className="p-6 text-center">
        <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nanny Not Found</h2>
        <p className="text-muted-foreground">The requested nanny profile could not be found.</p>
        <Button onClick={() => navigate('/admin/nannies')} className="mt-4">
          Back to Nannies
        </Button>
      </div>
    );
  }

  const nannyName = `${nanny.profiles.first_name} ${nanny.profiles.last_name}`;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin/nannies">Nannies</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/admin/nanny-profile/${nannyId}`}>{nannyName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Photo */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-6">
          <Button variant="outline" onClick={() => navigate(`/admin/nanny-profile/${nannyId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              {nanny.profiles.avatar_url ? (
                <img 
                  src={nanny.profiles.avatar_url} 
                  alt={nannyName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-border cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => setShowPhotoUpload(true)}
                  onError={(e) => {
                    console.log(' Admin nanny profile image failed to load:', e.currentTarget.src);
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-24 h-24 bg-gradient-to-r from-fuchsia-400 to-pink-400 rounded-full flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity border-2 border-border';
                      fallback.innerHTML = '<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                      fallback.onclick = () => setShowPhotoUpload(true);
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div 
                  className="w-24 h-24 bg-gradient-to-r from-fuchsia-400 to-pink-400 rounded-full flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity border-2 border-border"
                  onClick={() => setShowPhotoUpload(true)}
                >
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="absolute -bottom-1 -right-1 w-8 h-8 p-0 rounded-full bg-background border shadow-sm hover:bg-accent"
                onClick={() => setShowPhotoUpload(true)}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            {!nanny.profiles.avatar_url && (
              <p className="text-xs text-muted-foreground text-center">No photo uploaded</p>
            )}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{nannyName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={`${getStatusColor(nanny.approval_status)} border`}>
                {nanny.approval_status}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                {nanny.profiles.email}
              </div>
              {nanny.profiles.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {nanny.profiles.phone}
                </div>
              )}
              {nanny.profiles.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {nanny.profiles.location}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-gradient-to-r from-blue-600 to-fuchsia-600 hover:from-blue-700 hover:to-fuchsia-700">
          {saving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Single Page Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-fuchsia-50">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Experience Level</Label>
                <Select value={formData.experience_level} onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-3">1-3 years</SelectItem>
                    <SelectItem value="3-6">3-6 years</SelectItem>
                    <SelectItem value="6+">6+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Hourly Rate (ZAR)</Label>
                <Input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="150"
                  min="0"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills & Qualifications */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-fuchsia-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-fuchsia-600" />
                Skills & Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Languages</Label>
                <MultiSelect
                  options={AVAILABLE_LANGUAGES.map(lang => ({ value: lang, label: lang }))}
                  selected={formData.languages}
                  onChange={(selected) => setFormData(prev => ({ ...prev, languages: selected }))}
                  placeholder="Select languages"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Skills</Label>
                <MultiSelect
                  options={AVAILABLE_SKILLS.map(skill => ({ value: skill, label: skill }))}
                  selected={formData.skills}
                  onChange={(selected) => setFormData(prev => ({ ...prev, skills: selected }))}
                  placeholder="Select skills"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Certifications</Label>
                <MultiSelect
                  options={AVAILABLE_CERTIFICATIONS.map(cert => ({ value: cert, label: cert }))}
                  selected={formData.certifications}
                  onChange={(selected) => setFormData(prev => ({ ...prev, certifications: selected }))}
                  placeholder="Select certifications"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Admin Controls */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-600" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Approval Status</Label>
                <Select value={formData.approval_status} onValueChange={(value) => setFormData(prev => ({ ...prev, approval_status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admin can approve nannies even if documents are incomplete
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Verified Status</Label>
                  <Switch
                    checked={formData.is_verified}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_verified: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Available for Bookings</Label>
                  <Switch
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Can Receive Bookings</Label>
                  <Switch
                    checked={formData.can_receive_bookings}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_receive_bookings: checked }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Service Categories</Label>
                
                {/* Long-Term Services Section */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm text-muted-foreground">Long-Term Services</h4>
                  
                  {SERVICE_CATEGORIES_GROUPED.LONG_TERM.map((service) => (
                    <div key={service.value} className="flex items-center justify-between">
                      <Label htmlFor={`service-${service.value}`} className="cursor-pointer">
                        {service.label}
                      </Label>
                      <Switch
                        id={`service-${service.value}`}
                        checked={formData.service_categories?.includes(service.value)}
                        onCheckedChange={(checked) => 
                          handleServiceToggle(service.value, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
                
                {/* Short-Term Services Section */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm text-muted-foreground">Short-Term Services</h4>
                  
                  {SERVICE_CATEGORIES_GROUPED.SHORT_TERM.map((service) => (
                    <div key={service.value} className="flex items-center justify-between">
                      <Label htmlFor={`service-${service.value}`} className="cursor-pointer">
                        {service.label}
                      </Label>
                      <Switch
                        id={`service-${service.value}`}
                        checked={formData.service_categories?.includes(service.value)}
                        onCheckedChange={(checked) => 
                          handleServiceToggle(service.value, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Toggle services that this nanny can provide. Long-term includes live-in and live-out arrangements.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Admin Assigned Categories</Label>
                <MultiSelect
                  options={ADMIN_CATEGORIES}
                  selected={formData.admin_assigned_categories}
                  onChange={(selected) => setFormData(prev => ({ ...prev, admin_assigned_categories: selected }))}
                  placeholder="Select admin categories"
                />
                <p className="text-xs text-muted-foreground">
                  Assign premium tiers for nanny ranking and visibility
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Admin Notes</Label>
                <Textarea
                  value={formData.admin_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
                  placeholder="Internal notes about this nanny..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Documents Management
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DocumentUpload targetUserId={nannyId} hideEmailSupport={true} isAdminView={true} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Save Button for Mobile */}
      <div className="fixed bottom-4 right-4 lg:hidden">
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          size="lg" 
          className="bg-gradient-to-r from-blue-600 to-fuchsia-600 hover:from-blue-700 hover:to-fuchsia-700 shadow-lg"
        >
          {saving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Photo Upload Dialog */}
      <PhotoUploadDialog
        open={showPhotoUpload}
        onOpenChange={setShowPhotoUpload}
        onPhotoUploaded={handlePhotoUploaded}
        currentPhotoUrl={nanny.profiles.avatar_url}
        targetUserId={nannyId}
      />
    </div>
  );
};

export default AdminNannyProfileEdit;
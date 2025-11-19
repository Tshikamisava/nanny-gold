import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Star, 
  Calendar, 
  Phone, 
  Mail, 
  Edit,
  CheckCircle,
  XCircle,
  MessageCircle,
  FileText,
  Award,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/pricingUtils';

interface NannyProfile {
  id: string;
  bio: string;
  experience_level: string;
  hourly_rate: number;
  monthly_rate: number;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  is_verified: boolean;
  approval_status: string;
  verification_status: string;
  interview_status: string;
  languages: string[];
  skills: string[];
  certifications: string[];
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    location: string;
  };
  nanny_services: {
    pet_care: boolean;
    cooking: boolean;
    special_needs: boolean;
    ecd_training: boolean;
    montessori: boolean;
    driving_license: boolean;
  } | null;
}

export default function AdminNannyProfileView() {
  const { nannyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nanny, setNanny] = useState<NannyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadNannyProfile();
  }, [nannyId]);

  const loadNannyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('nannies')
        .select(`
          *,
          profiles!inner(
            first_name,
            last_name,
            email,
            phone,
            location
          ),
          nanny_services(
            pet_care,
            cooking,
            special_needs,
            ecd_training,
            montessori,
            driving_license
          )
        `)
        .eq('id', nannyId)
        .single();

      if (error) throw error;
      setNanny(data);
      setAdminNotes(data.admin_notes || '');
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

  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    if (!nanny) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('nannies')
        .update({ 
          approval_status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: adminNotes,
          approved_by: action === 'approve' ? (await supabase.auth.getUser()).data.user?.id : null,
          approved_at: action === 'approve' ? new Date().toISOString() : null
        })
        .eq('id', nanny.id);

      if (error) throw error;

      toast({
        title: action === 'approve' ? "Nanny Approved" : "Nanny Rejected",
        description: `${nanny.profiles.first_name} ${nanny.profiles.last_name} has been ${action}d`,
      });

      loadNannyProfile();
    } catch (error) {
      console.error(`Error ${action}ing nanny:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} nanny`,
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const saveAdminNotes = async () => {
    if (!nanny) return;

    try {
      const { error } = await supabase
        .from('nannies')
        .update({ admin_notes: adminNotes })
        .eq('id', nanny.id);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Admin notes have been updated",
      });
    } catch (error) {
      console.error('Error saving admin notes:', error);
      toast({
        title: "Error",
        description: "Failed to save admin notes",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Nanny Profiles</h1>
            <p className="text-muted-foreground">Loading nanny profile...</p>
          </div>
        </div>
        <div className="text-center py-8">
          <User className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading nanny profile...</p>
        </div>
      </div>
    );
  }

  if (!nanny) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Nanny Profiles</h1>
            <p className="text-muted-foreground">Nanny profile not found</p>
          </div>
        </div>
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-gray-600">Nanny profile not found</p>
        </div>
      </div>
    );
  }

  const nannyName = `${nanny.profiles.first_name} ${nanny.profiles.last_name}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{nannyName}</h1>
            <p className="text-muted-foreground">Admin Profile View</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={nanny.is_available ? 'default' : 'secondary'}>
            {nanny.is_available ? 'Available' : 'Unavailable'}
          </Badge>
          <Badge variant={
            nanny.approval_status === 'approved' ? 'default' :
            nanny.approval_status === 'rejected' ? 'destructive' : 'outline'
          }>
            {nanny.approval_status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{nanny.profiles.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{nanny.profiles.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{nanny.profiles.location || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Experience Level</p>
                  <p className="font-medium">{nanny.experience_level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{nanny.rating}/5</span>
                    <span className="text-sm text-muted-foreground">({nanny.total_reviews} reviews)</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{new Date(nanny.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Bio</p>
                <p className="text-sm bg-muted p-3 rounded-md">{nanny.bio || 'No bio provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Services & Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Services & Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="services">
                <TabsList>
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="certifications">Certifications</TabsTrigger>
                </TabsList>
                <TabsContent value="services" className="space-y-2">
                  {nanny.nanny_services && (
                    <div className="flex flex-wrap gap-2">
                      {nanny.nanny_services.pet_care && <Badge variant="outline">Pet Care</Badge>}
                      {nanny.nanny_services.cooking && <Badge variant="outline">Cooking</Badge>}
                      {nanny.nanny_services.special_needs && <Badge variant="outline">Special Needs</Badge>}
                      {nanny.nanny_services.ecd_training && <Badge variant="outline">ECD Training</Badge>}
                      {nanny.nanny_services.montessori && <Badge variant="outline">Montessori</Badge>}
                      {nanny.nanny_services.driving_license && <Badge variant="outline">Driving License</Badge>}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="skills">
                  <div className="flex flex-wrap gap-2">
                    {nanny.skills?.map((skill, index) => (
                      <Badge key={index} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="certifications">
                  <div className="flex flex-wrap gap-2">
                    {nanny.certifications?.map((cert, index) => (
                      <Badge key={index} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions Sidebar */}
        <div className="space-y-6">
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Verification</span>
                <Badge variant={nanny.verification_status === 'verified' ? 'default' : 'outline'}>
                  {nanny.verification_status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Interview</span>
                <Badge variant={nanny.interview_status === 'passed' ? 'default' : 'outline'}>
                  {nanny.interview_status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Verified</span>
                <Badge variant={nanny.is_verified ? 'default' : 'outline'}>
                  {nanny.is_verified ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nanny.approval_status === 'pending' && (
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => handleApprovalAction('approve')}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Nanny
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => handleApprovalAction('reject')}
                    disabled={actionLoading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Nanny
                  </Button>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/admin/support?user_id=${nanny.id}`)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Nanny
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/admin/nanny-profile/${nanny.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/admin/verification?nanny_id=${nanny.id}`)}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Documents
              </Button>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add internal notes about this nanny..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
              <Button onClick={saveAdminNotes} className="w-full">
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
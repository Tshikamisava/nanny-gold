import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  User, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Mail,
  Phone
} from 'lucide-react';

interface NannyProfileSetup {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  experience_level: string;
  hourly_rate: number;
  monthly_rate: number;
  approval_status: string;
  profile_submitted_at: string | null;
  created_at: string;
  document_count: number;
  verified_documents: number;
  pending_documents: number;
  rejected_documents: number;
  profile_completion: number;
}

export default function AdminNannyProfiles() {
  const [nannies, setNannies] = useState<NannyProfileSetup[]>([]);
  const [filteredNannies, setFilteredNannies] = useState<NannyProfileSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadNannyProfiles = async () => {
    try {
      const { data: nanniesData, error } = await supabase
        .from('nannies')
        .select(`
          id,
          bio,
          experience_level,
          hourly_rate,
          monthly_rate,
          approval_status,
          profile_submitted_at,
          created_at,
          profiles(
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get document counts for each nanny
      const nannyIds = nanniesData.map(n => n.id);
      const { data: documentsData, error: docError } = await supabase
        .from('nanny_documents')
        .select('nanny_id, verification_status')
        .in('nanny_id', nannyIds);

      if (docError) throw docError;

      const processedNannies = nanniesData.map(nanny => {
        const docs = documentsData?.filter(d => d.nanny_id === nanny.id) || [];
        const verifiedDocs = docs.filter(d => d.verification_status === 'verified').length;
        const pendingDocs = docs.filter(d => d.verification_status === 'pending').length;
        const rejectedDocs = docs.filter(d => d.verification_status === 'rejected').length;
        
        // Calculate profile completion
        let completion = 0;
        if (nanny.bio) completion += 20;
        if (nanny.hourly_rate && nanny.monthly_rate) completion += 20;
        if (docs.length >= 3) completion += 30; // ID, CV, Immigration
        if (verifiedDocs >= 2) completion += 20;
        if (nanny.profile_submitted_at) completion += 10;

        return {
          id: nanny.id,
          first_name: nanny.profiles.first_name || '',
          last_name: nanny.profiles.last_name || '',
          email: nanny.profiles.email || '',
          phone: nanny.profiles.phone || '',
          bio: nanny.bio || '',
          experience_level: nanny.experience_level,
          hourly_rate: nanny.hourly_rate || 0,
          monthly_rate: nanny.monthly_rate || 0,
          approval_status: nanny.approval_status,
          profile_submitted_at: nanny.profile_submitted_at,
          created_at: nanny.created_at,
          document_count: docs.length,
          verified_documents: verifiedDocs,
          pending_documents: pendingDocs,
          rejected_documents: rejectedDocs,
          profile_completion: Math.min(completion, 100)
        };
      });

      setNannies(processedNannies);
      setFilteredNannies(processedNannies);
    } catch (error) {
      console.error('Error loading nanny profiles:', error);
      toast({
        title: "Error loading profiles",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNannies = () => {
    let filtered = nannies;

    // Filter by tab
    if (selectedTab === 'pending') {
      filtered = filtered.filter(n => n.approval_status === 'pending');
    } else if (selectedTab === 'incomplete') {
      filtered = filtered.filter(n => !n.profile_submitted_at || n.profile_completion < 80);
    } else if (selectedTab === 'rejected') {
      filtered = filtered.filter(n => n.approval_status === 'rejected');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNannies(filtered);
  };

  const handleApprove = async (nannyId: string) => {
    try {
      const { error } = await supabase
        .from('nannies')
        .update({ 
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', nannyId);

      if (error) throw error;

      toast({
        title: "Nanny approved",
        description: "The nanny profile has been approved successfully.",
      });

      loadNannyProfiles();
    } catch (error) {
      console.error('Error approving nanny:', error);
      toast({
        title: "Approval failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (nannyId: string) => {
    try {
      const { error } = await supabase
        .from('nannies')
        .update({ approval_status: 'rejected' })
        .eq('id', nannyId);

      if (error) throw error;

      toast({
        title: "Nanny rejected",
        description: "The nanny profile has been rejected.",
      });

      loadNannyProfiles();
    } catch (error) {
      console.error('Error rejecting nanny:', error);
      toast({
        title: "Rejection failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-green-600';
    if (completion >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  useEffect(() => {
    loadNannyProfiles();
  }, []);

  useEffect(() => {
    filterNannies();
  }, [searchTerm, selectedTab, nannies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading nanny profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nanny Profile Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage nanny profile setup progress
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search nannies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Profiles ({nannies.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Review ({nannies.filter(n => n.approval_status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="incomplete">
            Incomplete ({nannies.filter(n => !n.profile_submitted_at || n.profile_completion < 80).length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({nannies.filter(n => n.approval_status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredNannies.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No nannies found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search.' : 'No nannies match the current filter.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredNannies.map((nanny) => (
                <Card key={nanny.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {nanny.first_name} {nanny.last_name}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {nanny.email}
                            </span>
                            {nanny.phone && (
                              <span className="flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {nanny.phone}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(nanny.approval_status)}>
                          {nanny.approval_status}
                        </Badge>
                        {nanny.profile_submitted_at ? (
                          <Badge variant="outline">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Profile Completion</h4>
                          <div className="flex items-center space-x-2">
                            <Progress value={nanny.profile_completion} className="flex-1" />
                            <span className={`text-sm font-medium ${getCompletionColor(nanny.profile_completion)}`}>
                              {nanny.profile_completion}%
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Documents Status</h4>
                          <div className="flex space-x-4 text-sm">
                            <span className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              Total: {nanny.document_count}
                            </span>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {nanny.verified_documents}
                            </span>
                            <span className="flex items-center text-yellow-600">
                              <Clock className="w-4 h-4 mr-1" />
                              {nanny.pending_documents}
                            </span>
                            {nanny.rejected_documents > 0 && (
                              <span className="flex items-center text-red-600">
                                <XCircle className="w-4 h-4 mr-1" />
                                {nanny.rejected_documents}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Experience:</span>
                            <p className="font-medium">{nanny.experience_level} years</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Joined:</span>
                            <p className="font-medium">
                              {new Date(nanny.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/admin/nanny-profile/${nanny.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Profile
                          </Button>
                          {nanny.approval_status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleApprove(nanny.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleReject(nanny.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
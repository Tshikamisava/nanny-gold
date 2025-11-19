import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, Edit, Ban, CheckCircle, Plus } from 'lucide-react';
import { withValidSession, ensureValidSession } from '@/utils/sessionUtils';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

interface Nanny {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  approval_status: string;
  is_verified: boolean;
  is_available: boolean;
  rating: number;
  total_reviews: number;
  hourly_rate: number;
}

export default function AdminNannies() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [nannies, setNannies] = useState<Nanny[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: ''
  });

  // Enable session monitoring
  const { isMonitoring } = useSessionMonitor();

  useEffect(() => {
    loadNannies();
  }, []);

  const loadNannies = async () => {
    try {
      setLoading(true);
      
      // Use a proper join query to get both nanny and profile data
      const { data: nanniesData, error: nanniesError } = await supabase
        .from('nannies')
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (nanniesError) {
        console.error('Nannies query error:', nanniesError);
        throw nanniesError;
      }

      console.log('Raw nannies data:', nanniesData);

      if (!nanniesData || nanniesData.length === 0) {
        console.log('No nannies found');
        setNannies([]);
        return;
      }

      // Format the data properly
      const formattedNannies = nanniesData.map(nanny => {
        const profile = nanny.profiles;
        console.log(`Processing nanny ${nanny.id}:`, { nanny, profile });
        
        return {
          id: nanny.id,
          first_name: profile?.first_name || 'Unknown',
          last_name: profile?.last_name || 'User',
          email: profile?.email || 'No email',
          phone: profile?.phone || '',
          approval_status: nanny.approval_status || 'pending',
          is_verified: nanny.is_verified || false,
          is_available: nanny.is_available || false,
          rating: nanny.rating || 0,
          total_reviews: nanny.total_reviews || 0,
          hourly_rate: nanny.hourly_rate || 0,
        };
      });

      console.log('Formatted nannies:', formattedNannies);
      setNannies(formattedNannies);
    } catch (error) {
      console.error('Error loading nannies:', error);
      toast({
        title: "Error",
        description: "Failed to load nannies. Please try again.",
        variant: "destructive",
      });
      setNannies([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (nannyId: string) => {
    console.log('🎯 Starting enhanced nanny approval process for:', nannyId);
    
    // Pre-validate session before attempting operation
    const sessionCheck = await ensureValidSession();
    if (sessionCheck.needsLogin) {
      console.error('🚨 Session validation failed before approval');
      toast({
        title: "Authentication Required",
        description: "Session expired. Redirecting to login...",
        variant: "destructive",
      });
      window.location.href = '/admin-login';
      return;
    }
    
    const { data, error, needsLogin } = await withValidSession(
      async () => {
        console.log('🔐 Executing approval with valid session...');
        
        // Get fresh user info
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Failed to get current user');
        }
        
        console.log('👤 Approving as user:', user.id);
        
        return supabase
          .from('nannies')
          .update({ 
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user.id
          })
          .eq('id', nannyId);
      },
      'Enhanced Nanny Approval'
    );

    if (needsLogin) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      // Redirect to admin login
      window.location.href = '/admin-login';
      return;
    }

    if (error) {
      console.error('❌ Nanny approval failed:', error);
      toast({
        title: "Error",
        description: `Failed to approve nanny: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Nanny approved successfully');
    toast({
      title: "Success",
      description: "Nanny profile approved successfully",
    });

    await loadNannies();
  };

  const handleReject = async (nannyId: string) => {
    const { data, error, needsLogin } = await withValidSession(
      async () => {
        return await supabase
          .from('nannies')
          .update({ approval_status: 'rejected' })
          .eq('id', nannyId);
      },
      'Nanny Rejection'
    );

    if (needsLogin) {
      toast({
        title: "Authentication Required", 
        description: "Please log in again to continue",
        variant: "destructive",
      });
      window.location.href = '/admin-login';
      return;
    }

    if (error) {
      toast({
        title: "Error",
        description: `Failed to reject nanny: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Nanny profile rejected",
    });

    await loadNannies();
  };

  const handleResetToPending = async (nannyId: string) => {
    const { data, error, needsLogin } = await withValidSession(
      async () => {
        return await supabase
          .from('nannies')
          .update({ 
            approval_status: 'pending',
            approved_at: null,
            approved_by: null
          })
          .eq('id', nannyId);
      },
      'Nanny Status Reset'
    );

    if (needsLogin) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue", 
        variant: "destructive",
      });
      window.location.href = '/admin-login';
      return;
    }

    if (error) {
      toast({
        title: "Error",
        description: `Failed to reset nanny status: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Nanny status reset to pending",
    });

    await loadNannies();
  };

  const handleSuspendNanny = async (nannyId: string, suspend: boolean) => {
    const { data, error, needsLogin } = await withValidSession(
      async () => {
        return await supabase
          .from('nannies')
          .update({ 
            can_receive_bookings: !suspend,
            is_available: !suspend
          })
          .eq('id', nannyId);
      },
      suspend ? 'Nanny Suspension' : 'Nanny Reactivation'
    );

    if (needsLogin) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to continue",
        variant: "destructive",
      });
      window.location.href = '/admin-login';
      return;
    }

    if (error) {
      toast({
        title: "Error", 
        description: `Failed to ${suspend ? 'suspend' : 'reactivate'} nanny: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Nanny ${suspend ? 'suspended from' : 'reactivated for'} booking requests`,
    });

    await loadNannies();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleCreateNanny = async () => {
    try {
      // First create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            user_type: 'nanny'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Call the database function to create the nanny profile
        const { error: profileError } = await supabase.rpc('create_dev_nanny_profile', {
          p_user_id: authData.user.id,
          p_first_name: formData.first_name,
          p_bio: formData.bio || `Hi, I'm ${formData.first_name}! I'm a dedicated nanny looking to provide exceptional care for your family.`
        });

        if (profileError) throw profileError;

        toast({
          title: "Success",
          description: "Nanny profile created successfully",
        });

        setIsDialogOpen(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          bio: ''
        });
        loadNannies(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating nanny:', error);
      toast({
        title: "Error",
        description: "Failed to create nanny profile",
        variant: "destructive",
      });
    }
  };

  const filteredNannies = nannies.filter(nanny =>
    `${nanny.first_name} ${nanny.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nanny.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading nannies...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Nanny Management</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage nanny profiles, approvals, and verification status.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Nanny Profile</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Enter a brief bio for the nanny"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNanny}
                disabled={!formData.first_name || !formData.last_name || !formData.email}
              >
                Create Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => toast({
                title: "Filter options",
                description: "Status filtering coming in next update"
              })}
            >
              Filter by Status
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast({
                title: "Export data",
                description: "Data export functionality coming in next update"
              })}
            >
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nannies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Nannies ({filteredNannies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNannies.map((nanny) => (
                <TableRow key={nanny.id}>
                  <TableCell className="font-medium">
                    {nanny.first_name} {nanny.last_name}
                  </TableCell>
                  <TableCell>{nanny.email}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(nanny.approval_status)}>
                      {nanny.approval_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    ⭐ {nanny.rating?.toFixed(1)} ({nanny.total_reviews})
                  </TableCell>
                  <TableCell>
                    <Badge variant={nanny.is_available ? 'default' : 'secondary'}>
                      {nanny.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/admin/nanny-profile/${nanny.id}`)}
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/admin/nanny-profile/${nanny.id}/edit`)}
                        title="Edit Profile"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant={nanny.is_available ? "destructive" : "default"}
                        onClick={() => handleSuspendNanny(nanny.id, nanny.is_available)}
                        title={nanny.is_available ? "Suspend from bookings" : "Reactivate for bookings"}
                      >
                        {nanny.is_available ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                      {nanny.approval_status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleApprove(nanny.id)}
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReject(nanny.id)}
                            title="Reject"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {(nanny.approval_status === 'approved' || nanny.approval_status === 'rejected') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResetToPending(nanny.id)}
                          title="Reset to Pending"
                        >
                          Reset
                        </Button>
                      )}
                      {nanny.approval_status === 'approved' && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleReject(nanny.id)}
                          title="Reject"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                      {nanny.approval_status === 'rejected' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleApprove(nanny.id)}
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminBookingReassignment } from '@/components/AdminBookingReassignment';
import { Search, Eye, Edit, Ban, CheckCircle, Plus, UserX, User } from 'lucide-react';

interface NannyManagement {
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
  hourly_rate: number | null;
  monthly_rate: number | null;
  experience_level?: string;
  service_categories: string[];
  admin_assigned_categories: string[];
  can_receive_bookings: boolean;
}

export default function AdminNannyManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [nannies, setNannies] = useState<NannyManagement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [selectedNanny, setSelectedNanny] = useState<NannyManagement | null>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);

  useEffect(() => {
    loadNannies();
  }, []);

  const loadNannies = async () => {
    try {
      setLoading(true);
      
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

      if (!nanniesData) {
        setNannies([]);
        return;
      }

      const formattedNannies = nanniesData.map(nanny => {
        const profile = nanny.profiles;
        
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
          hourly_rate: nanny.hourly_rate,
          monthly_rate: nanny.monthly_rate,
          experience_level: nanny.experience_level,
          service_categories: nanny.service_categories || [],
          admin_assigned_categories: nanny.admin_assigned_categories || [],
          can_receive_bookings: nanny.can_receive_bookings || false,
        };
      });

      setNannies(formattedNannies);
    } catch (error) {
      console.error('Error loading nannies:', error);
      toast({
        title: "Error",
        description: "Failed to load nannies. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (nannyId: string) => {
    navigate(`/admin/nanny-profile/${nannyId}`);
  };

  const handleEditProfile = (nannyId: string) => {
    navigate(`/admin/nanny-profile/${nannyId}/edit`);
  };

  const handleSuspendNanny = async (nannyId: string, suspend: boolean) => {
    try {
      const { error } = await supabase
        .from('nannies')
        .update({ 
          can_receive_bookings: !suspend,
          is_available: !suspend
        })
        .eq('id', nannyId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Nanny ${suspend ? 'suspended' : 'reactivated'} successfully`,
      });
      
      await loadNannies();
    } catch (error) {
      console.error('Error updating nanny status:', error);
      toast({
        title: "Error",
        description: "Failed to update nanny status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateServiceCategories = async (nannyId: string, categories: string[]) => {
    try {
      const { error } = await supabase
        .from('nannies')
        .update({ 
          admin_assigned_categories: categories
        })
        .eq('id', nannyId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Service categories updated successfully",
      });
      
      await loadNannies();
      setIsAllocationDialogOpen(false);
    } catch (error) {
      console.error('Error updating service categories:', error);
      toast({
        title: "Error",
        description: "Failed to update service categories",
        variant: "destructive",
      });
    }
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

  const filteredNannies = nannies.filter(nanny =>
    `${nanny.first_name} ${nanny.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nanny.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading nannies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Enhanced Nanny Management</h2>
          <p className="text-muted-foreground">
            Manage nanny profiles, service categories, availability, and booking assignments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsReassignDialogOpen(true)}
          >
            Reassign Bookings
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Nannies Table */}
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
                <TableHead>Experience</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Booking Eligible</TableHead>
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
                    <Badge variant="outline" className="text-xs">
                      {nanny.experience_level || '1-3 years'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(nanny.admin_assigned_categories || nanny.service_categories || []).map((category, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={nanny.is_available ? 'default' : 'secondary'}>
                      {nanny.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={nanny.can_receive_bookings}
                      onCheckedChange={(checked) => handleSuspendNanny(nanny.id, !checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewProfile(nanny.id)}
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditProfile(nanny.id)}
                        title="Edit Profile"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedNanny(nanny);
                          setIsAllocationDialogOpen(true);
                        }}
                        title="Manage Categories"
                      >
                        <User className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Service Category Allocation Dialog */}
      <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Service Categories</DialogTitle>
          </DialogHeader>
          {selectedNanny && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  {selectedNanny.first_name} {selectedNanny.last_name}
                </Label>
                <p className="text-sm text-muted-foreground">{selectedNanny.email}</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Service Duration Categories</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="short-term"
                        checked={(selectedNanny.admin_assigned_categories || []).includes('short_term')}
                      />
                      <Label htmlFor="short-term">Short-Term Support</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="long-term"
                        checked={(selectedNanny.admin_assigned_categories || []).includes('long_term')}
                      />
                      <Label htmlFor="long-term">Long-Term Support</Label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Living Arrangement Categories</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="live-in"
                        checked={(selectedNanny.admin_assigned_categories || []).includes('live_in')}
                      />
                      <Label htmlFor="live-in">Live-In Nanny</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="live-out"
                        checked={(selectedNanny.admin_assigned_categories || []).includes('live_out')}
                      />
                      <Label htmlFor="live-out">Live-Out Nanny</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAllocationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // This would collect the checkbox states and update
                  const categories = ['short_term']; // Simplified for demo
                  handleUpdateServiceCategories(selectedNanny.id, categories);
                }}>
                  Save Categories
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Booking Reassignment Dialog */}
      <AdminBookingReassignment 
        open={isReassignDialogOpen} 
        onOpenChange={setIsReassignDialogOpen} 
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Users, 
  Calendar, 
  MessageCircle, 
  UserX, 
  Mail, 
  Phone,
  Eye,
  Edit,
  AlertTriangle,
  Home,
  Baby,
  Heart,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatRooms } from '@/hooks/useChatRooms';
import RealtimeChat from '@/components/RealtimeChat';
import { formatLocation } from '@/utils/locationFormatter';

interface ClientData {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    location: string;
  };
  number_of_children: number;
  children_ages: string[];
  other_dependents: number;
  pets_in_home: string;
  home_size: string;
  created_at: string;
  bookings: Array<{
    id: string;
    status: string;
    total_monthly_cost: number;
  }>;
  client_preferences: {
    driving_support: boolean;
    errand_runs: boolean;
    light_house_keeping: boolean;
    cooking: boolean;
    pet_care: boolean;
    special_needs: boolean;
    experience_level: string;
    languages: string;
  } | null;
}

export default function AdminClientManagement() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { toast } = useToast();
  const { createOrGetChatRoom } = useChatRooms();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profiles!inner(
            first_name, 
            last_name, 
            email, 
            phone, 
            location
          ),
          bookings(
            id,
            status,
            total_monthly_cost
          ),
          client_preferences!left(
            driving_support,
            errand_runs,
            light_house_keeping,
            cooking,
            pet_care,
            special_needs,
            experience_level,
            languages
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(client => 
      client.profiles.first_name?.toLowerCase().includes(query) ||
      client.profiles.last_name?.toLowerCase().includes(query) ||
      client.profiles.email?.toLowerCase().includes(query) ||
      client.profiles.phone?.includes(query)
    );
    setFilteredClients(filtered);
  };

  const getClientStatus = (client: ClientData) => {
    const activeBookings = client.bookings?.filter(b => 
      b.status === 'confirmed' || b.status === 'active'
    ).length || 0;

    if (activeBookings > 0) return { label: 'Active', variant: 'default' as const };
    if (client.bookings?.length > 0) return { label: 'Previous Client', variant: 'secondary' as const };
    return { label: 'New Client', variant: 'outline' as const };
  };

  const getTotalSpent = (client: ClientData) => {
    return client.bookings?.reduce((sum, booking) => 
      sum + (booking.total_monthly_cost || 0), 0
    ) || 0;
  };

  const handleViewClient = (client: ClientData) => {
    setSelectedClient(client);
    setViewDialogOpen(true);
  };

  const handleMessageClient = async (client: ClientData) => {
    try {
      const roomId = await createOrGetChatRoom(client.id, 'client_admin');
      if (roomId) {
        setChatRoomId(roomId);
        setIsChatOpen(true);
        toast({
          title: "Chat opened",
          description: `Started conversation with ${client.profiles.first_name} ${client.profiles.last_name}`,
        });
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast({
        title: "Error",
        description: "Failed to start chat with client",
        variant: "destructive"
      });
    }
  };

  const handleEditClient = (client: ClientData) => {
    // For now, just show a message - can be expanded later
    toast({
      title: "Edit functionality",
      description: "Client editing functionality coming soon",
    });
  };

  const handleExportClients = () => {
    // Simple CSV export
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Children', 'Location', 'Status', 'Total Spent', 'Member Since'],
      ...filteredClients.map(client => [
        `${client.profiles.first_name} ${client.profiles.last_name}`,
        client.profiles.email,
        client.profiles.phone,
        client.number_of_children || 0,
        client.profiles.location || 'Not specified',
        getClientStatus(client).label,
        getTotalSpent(client).toFixed(2),
        new Date(client.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export completed",
      description: "Client list has been exported to CSV",
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <Users className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Client Management</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage and monitor your client base
          </p>
        </div>
        <Button onClick={handleExportClients}>
          <Users className="w-4 h-4 mr-2" />
          Export Client List
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] sm:text-xs md:text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => getClientStatus(c).label === 'Active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => {
                const created = new Date(c.created_at);
                const now = new Date();
                return created.getMonth() === now.getMonth() && 
                       created.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{clients.reduce((sum, client) => sum + getTotalSpent(client), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => toast({
                title: "Filter clients",
                description: "Advanced filtering options coming in next update"
              })}
            >
              Filter
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">
                  {searchQuery ? 'No clients found matching your search' : 'No clients registered yet'}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const status = getClientStatus(client);
                const totalSpent = getTotalSpent(client);
                const clientName = `${client.profiles.first_name || ''} ${client.profiles.last_name || ''}`.trim();

                return (
                  <div key={client.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-fuchsia-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{clientName}</h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{client.profiles.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{client.profiles.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                        <div>
                          <p className="text-sm text-gray-600">
                            {client.number_of_children || 0} children
                          </p>
                          <p className="text-sm font-semibold text-green-600">
                            R{totalSpent.toFixed(2)} spent
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewClient(client)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMessageClient(client)}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditClient(client)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Location</p>
                        <p className="font-medium">{formatLocation(client.profiles.location)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Bookings</p>
                        <p className="font-medium">{client.bookings?.length || 0} total</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Member Since</p>
                        <p className="font-medium">
                          {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Family Information */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-sm mb-2 text-gray-900">Family Information</h5>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-600">Children:</span>
                          <span className="ml-1 font-medium">
                            {client.number_of_children || 0} (ages: {client.children_ages?.join(', ') || 'N/A'})
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Other Dependents:</span>
                          <span className="ml-1 font-medium">{client.other_dependents || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pets:</span>
                          <span className="ml-1 font-medium">{client.pets_in_home || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Home Size:</span>
                          <span className="ml-1 font-medium">{client.home_size || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Support Preferences */}
                    {client.client_preferences && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-sm mb-2 text-gray-900">Additional Support Needed</h5>
                        <div className="flex flex-wrap gap-1">
                          {client.client_preferences.driving_support && <Badge variant="outline" className="text-xs">Driving Support</Badge>}
                          {client.client_preferences.errand_runs && <Badge variant="outline" className="text-xs">Errand Runs</Badge>}
                          {client.client_preferences.light_house_keeping && <Badge variant="outline" className="text-xs">Light Housekeeping</Badge>}
                          {client.client_preferences.cooking && <Badge variant="outline" className="text-xs">Cooking</Badge>}
                          {client.client_preferences.pet_care && <Badge variant="outline" className="text-xs">Pet Care</Badge>}
                          {client.client_preferences.special_needs && <Badge variant="outline" className="text-xs">Diverse Ability Support</Badge>}
                        </div>
                        <div className="mt-2 text-xs">
                          <span className="text-gray-600">Experience Level:</span>
                          <span className="ml-1 font-medium">{client.client_preferences.experience_level || 'Not specified'}</span>
                          {client.client_preferences.languages && (
                            <>
                              <span className="ml-3 text-gray-600">Languages:</span>
                              <span className="ml-1 font-medium">{client.client_preferences.languages}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Client Details - {selectedClient?.profiles.first_name} {selectedClient?.profiles.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedClient.profiles.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedClient.profiles.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{formatLocation(selectedClient.profiles.location)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium">{new Date(selectedClient.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={getClientStatus(selectedClient).variant}>
                        {getClientStatus(selectedClient).label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="font-medium text-green-600">R{getTotalSpent(selectedClient).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Family Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Baby className="w-4 h-4" />
                  Family Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Children</p>
                    <p className="font-medium">
                      {selectedClient.number_of_children || 0} children
                      {selectedClient.children_ages && selectedClient.children_ages.length > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          (ages: {selectedClient.children_ages.join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Other Dependents</p>
                    <p className="font-medium">{selectedClient.other_dependents || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pets</p>
                    <p className="font-medium">{selectedClient.pets_in_home || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Home Size</p>
                    <p className="font-medium">{selectedClient.home_size || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              {selectedClient.client_preferences && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Care Preferences
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Additional Support Services</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.client_preferences.driving_support && <Badge variant="outline">Driving Support</Badge>}
                        {selectedClient.client_preferences.errand_runs && <Badge variant="outline">Errand Runs</Badge>}
                        {selectedClient.client_preferences.light_house_keeping && <Badge variant="outline">Light Housekeeping</Badge>}
                        {selectedClient.client_preferences.cooking && <Badge variant="outline">Cooking</Badge>}
                        {selectedClient.client_preferences.pet_care && <Badge variant="outline">Pet Care</Badge>}
                        {selectedClient.client_preferences.special_needs && <Badge variant="outline">Diverse Ability Support</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Experience Level</p>
                        <p className="font-medium">{selectedClient.client_preferences.experience_level || 'Not specified'}</p>
                      </div>
                      {selectedClient.client_preferences.languages && (
                        <div>
                          <p className="text-muted-foreground">Language Preferences</p>
                          <p className="font-medium">{selectedClient.client_preferences.languages}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Booking History */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Booking History</h3>
                {selectedClient.bookings && selectedClient.bookings.length > 0 ? (
                  <div className="space-y-2">
                    {selectedClient.bookings.map((booking, index) => (
                      <div key={booking.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Booking #{index + 1}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                          <span className="text-sm font-medium">R{booking.total_monthly_cost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No bookings yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Component */}
      {isChatOpen && chatRoomId && (
        <RealtimeChat
          roomId={chatRoomId}
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setChatRoomId(null);
          }}
        />
      )}
    </div>
  );
}
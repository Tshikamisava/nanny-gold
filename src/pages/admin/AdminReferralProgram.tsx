import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Users, Gift, TrendingUp, DollarSign, Wand, Upload } from 'lucide-react';
import { 
  useReferralParticipants, 
  useReferralLogs, 
  useCreateReferralParticipant, 
  useUpdateReferralParticipant,
  useCreateReferralLog,
  useUpdateReferralLog,
  useAllUsers,
  useUsersWithoutReferralCodes,
  useBulkCreateReferralParticipants,
  ReferralParticipant,
  ReferralLog
} from '@/hooks/useReferralProgram';
import { generateBulkCodes } from '@/utils/referralCodeGenerator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const AdminReferralProgram = () => {
  const { toast } = useToast();
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ReferralParticipant | null>(null);
  const [editingReferral, setEditingReferral] = useState<ReferralLog | null>(null);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const { data: participants, isLoading: participantsLoading } = useReferralParticipants();
  const { data: referralLogs, isLoading: referralsLoading } = useReferralLogs();
  const { data: allUsers } = useAllUsers();
  const { data: usersWithoutCodes } = useUsersWithoutReferralCodes();
  
  const createParticipant = useCreateReferralParticipant();
  const updateParticipant = useUpdateReferralParticipant();
  const createReferral = useCreateReferralLog();
  const updateReferral = useUpdateReferralLog();
  const bulkCreateParticipants = useBulkCreateReferralParticipants();

  const [participantForm, setParticipantForm] = useState({
    user_id: '',
    role: '' as 'Client' | 'Nanny',
    referral_code: '',
    notes: ''
  });

  const [referralForm, setReferralForm] = useState({
    referrer_id: '',
    referred_user_id: '',
    placement_fee: '',
    notes: ''
  });

  const generateReferralCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setParticipantForm(prev => ({ ...prev, referral_code: code }));
  };

  const handleCreateParticipant = () => {
    if (!participantForm.user_id || !participantForm.role || !participantForm.referral_code) return;
    
    createParticipant.mutate({
      user_id: participantForm.user_id,
      role: participantForm.role,
      referral_code: participantForm.referral_code,
      notes: participantForm.notes || undefined
    }, {
      onSuccess: () => {
        setParticipantDialogOpen(false);
        setParticipantForm({ user_id: '', role: '' as 'Client' | 'Nanny', referral_code: '', notes: '' });
      }
    });
  };

  const handleUpdateParticipant = () => {
    if (!editingParticipant) return;
    
    updateParticipant.mutate({
      id: editingParticipant.id,
      updates: {
        notes: participantForm.notes
      }
    }, {
      onSuccess: () => {
        setParticipantDialogOpen(false);
        setEditingParticipant(null);
        setParticipantForm({ user_id: '', role: '' as 'Client' | 'Nanny', referral_code: '', notes: '' });
      }
    });
  };

  const handleCreateReferral = () => {
    if (!referralForm.referrer_id || !referralForm.referred_user_id) return;
    
    createReferral.mutate({
      referrer_id: referralForm.referrer_id,
      referred_user_id: referralForm.referred_user_id,
      placement_fee: referralForm.placement_fee ? parseFloat(referralForm.placement_fee) : undefined,
      notes: referralForm.notes || undefined
    }, {
      onSuccess: () => {
        setReferralDialogOpen(false);
        setReferralForm({ referrer_id: '', referred_user_id: '', placement_fee: '', notes: '' });
      }
    });
  };

  const handleUpdateReferralStatus = (id: string, status: 'Pending' | 'Approved' | 'Paid') => {
    updateReferral.mutate({ id, updates: { status } });
  };

  const handleUpdateReferralFee = (id: string, placement_fee: number) => {
    updateReferral.mutate({ id, updates: { placement_fee } });
  };

  const handleAutoGenerateForAll = async () => {
    if (!usersWithoutCodes || usersWithoutCodes.length === 0) {
      toast({
        title: "No users found",
        description: "All users already have referral codes",
      });
      return;
    }

    setIsGeneratingBulk(true);
    
    try {
      // Generate unique codes
      const codes = generateBulkCodes(usersWithoutCodes.length);
      
      // Prepare participant data
      const newParticipants = usersWithoutCodes.map((user, index) => ({
        user_id: user.id,
        role: (user.user_type === 'nanny' ? 'Nanny' : 'Client') as 'Client' | 'Nanny',
        referral_code: codes[index],
      }));
      
      // Bulk insert
      await bulkCreateParticipants.mutateAsync(newParticipants);
      
      toast({
        title: "Success!",
        description: `Generated ${newParticipants.length} referral codes`,
      });
    } catch (error) {
      console.error('Bulk generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate codes",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handleBulkGenerateSelected = async () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingBulk(true);

    try {
      const selectedUsers = usersWithoutCodes?.filter(user => selectedUserIds.has(user.id)) || [];
      const codes = generateBulkCodes(selectedUsers.length);

      const newParticipants = selectedUsers.map((user, index) => ({
        user_id: user.id,
        role: (user.user_type === 'nanny' ? 'Nanny' : 'Client') as 'Client' | 'Nanny',
        referral_code: codes[index],
      }));

      await bulkCreateParticipants.mutateAsync(newParticipants);

      setBulkDialogOpen(false);
      setSelectedUserIds(new Set());
      
      toast({
        title: "Success!",
        description: `Generated ${newParticipants.length} referral codes`,
      });
    } catch (error) {
      console.error('Bulk generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate codes",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const openEditParticipant = (participant: ReferralParticipant) => {
    setEditingParticipant(participant);
    setParticipantForm({
      user_id: participant.user_id,
      role: participant.role,
      referral_code: participant.referral_code,
      notes: participant.notes || ''
    });
    setParticipantDialogOpen(true);
  };

  const totalParticipants = participants?.length || 0;
  const totalReferrals = referralLogs?.length || 0;
  const totalRewards = referralLogs?.reduce((sum, log) => sum + (log.reward_amount || 0), 0) || 0;
  const pendingRewards = referralLogs?.filter(log => log.status === 'Pending').reduce((sum, log) => sum + (log.reward_amount || 0), 0) || 0;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Paid': return 'default' as const;
      case 'Approved': return 'secondary' as const;
      case 'Pending': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'Nanny' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">Manage referral participants and track rewards</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalRewards.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{pendingRewards.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="referrals">Referral Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Referral Participants</CardTitle>
                  <CardDescription>Manage users participating in the referral program</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {usersWithoutCodes && usersWithoutCodes.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleAutoGenerateForAll}
                      disabled={isGeneratingBulk}
                      className="flex items-center gap-2"
                    >
                      <Wand className="h-4 w-4" />
                      {isGeneratingBulk ? 'Generating...' : `Auto-Generate (${usersWithoutCodes.length})`}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={() => setBulkDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Bulk Import
                  </Button>
                  
                  <Button 
                    onClick={() => setParticipantDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Participant
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Total Referrals</TableHead>
                    <TableHead>Total Rewards</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">Loading participants...</TableCell>
                    </TableRow>
                  ) : participants?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">No participants found</TableCell>
                    </TableRow>
                  ) : (
                    participants?.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell>
                          {participant.user?.first_name} {participant.user?.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(participant.role)}>
                            {participant.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{participant.user?.email}</div>
                            <div className="text-sm text-muted-foreground">{participant.user?.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{participant.referral_code}</Badge>
                        </TableCell>
                        <TableCell>{participant.total_referrals}</TableCell>
                        <TableCell>R{(participant.total_rewards || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {new Date(participant.date_added).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm">{participant.notes}</div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditParticipant(participant)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Referral Logs</CardTitle>
                  <CardDescription>Track referrals and manage rewards</CardDescription>
                </div>
                <Button 
                  onClick={() => setReferralDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Referral
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred User</TableHead>
                    <TableHead>Placement Fee</TableHead>
                    <TableHead>Reward %</TableHead>
                    <TableHead>Reward Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading referrals...</TableCell>
                    </TableRow>
                  ) : referralLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">No referrals found</TableCell>
                    </TableRow>
                  ) : (
                    referralLogs?.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{referral.referrer?.user?.first_name} {referral.referrer?.user?.last_name}</div>
                            <Badge className={getRoleColor(referral.referrer?.role || '')}>
                              {referral.referrer?.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {referral.referred_user?.first_name} {referral.referred_user?.last_name}
                        </TableCell>
                        <TableCell>
                          <PlacementFeeCell 
                            referralId={referral.id} 
                            currentFee={referral.placement_fee} 
                            onUpdate={handleUpdateReferralFee}
                          />
                        </TableCell>
                        <TableCell>{referral.reward_percentage}%</TableCell>
                        <TableCell>R{(referral.reward_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Select 
                            value={referral.status} 
                            onValueChange={(value) => handleUpdateReferralStatus(referral.id, value as any)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {new Date(referral.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(referral.status)}>
                            {referral.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Participant Dialog */}
      <Dialog open={participantDialogOpen} onOpenChange={setParticipantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingParticipant ? 'Edit Participant' : 'Add Participant'}
            </DialogTitle>
            <DialogDescription>
              {editingParticipant ? 'Update participant information' : 'Add a new participant to the referral program'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!editingParticipant && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="user">User</Label>
                  <Select value={participantForm.user_id} onValueChange={(value) => 
                    setParticipantForm(prev => ({ ...prev, user_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={participantForm.role} onValueChange={(value) => 
                    setParticipantForm(prev => ({ ...prev, role: value as 'Client' | 'Nanny' }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Client">Client</SelectItem>
                      <SelectItem value="Nanny">Nanny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referral_code">Referral Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="referral_code"
                      value={participantForm.referral_code}
                      onChange={(e) => setParticipantForm(prev => ({ ...prev, referral_code: e.target.value }))}
                      placeholder="Enter referral code"
                    />
                    <Button type="button" variant="outline" onClick={generateReferralCode}>
                      Generate
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={participantForm.notes}
                onChange={(e) => setParticipantForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setParticipantDialogOpen(false);
              setEditingParticipant(null);
              setParticipantForm({ user_id: '', role: '' as 'Client' | 'Nanny', referral_code: '', notes: '' });
            }}>
              Cancel
            </Button>
            <Button onClick={editingParticipant ? handleUpdateParticipant : handleCreateParticipant}>
              {editingParticipant ? 'Update' : 'Add'} Participant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Participants</DialogTitle>
            <DialogDescription>
              Select users to generate referral codes for. Codes will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Multi-select for users without codes */}
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Users Without Referral Codes</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedUserIds.size === usersWithoutCodes?.length) {
                      setSelectedUserIds(new Set());
                    } else {
                      setSelectedUserIds(new Set(usersWithoutCodes?.map(u => u.id) || []));
                    }
                  }}
                >
                  {selectedUserIds.size === usersWithoutCodes?.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              {usersWithoutCodes && usersWithoutCodes.length > 0 ? (
                <div className="space-y-2">
                  {usersWithoutCodes.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                      <Checkbox 
                        id={user.id}
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                      <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                        {user.first_name} {user.last_name} ({user.email}) - <Badge variant="outline">{user.user_type}</Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All users already have referral codes!
                </p>
              )}
            </div>
            
            {selectedUserIds.size > 0 && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                ℹ️ {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected. Unique codes will be auto-generated.
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBulkDialogOpen(false);
              setSelectedUserIds(new Set());
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkGenerateSelected}
              disabled={selectedUserIds.size === 0 || isGeneratingBulk}
            >
              {isGeneratingBulk ? 'Generating...' : `Generate & Add (${selectedUserIds.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Referral Dialog */}
      <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Referral</DialogTitle>
            <DialogDescription>Record a new referral for reward tracking</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referrer">Referrer</Label>
              <Select value={referralForm.referrer_id} onValueChange={(value) => 
                setReferralForm(prev => ({ ...prev, referrer_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select referrer" />
                </SelectTrigger>
                <SelectContent>
                  {participants?.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.user?.first_name} {participant.user?.last_name} - {participant.referral_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referred_user">Referred User</Label>
              <Select value={referralForm.referred_user_id} onValueChange={(value) => 
                setReferralForm(prev => ({ ...prev, referred_user_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select referred user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placement_fee">Placement Fee (Optional)</Label>
              <Input
                id="placement_fee"
                type="number"
                step="0.01"
                value={referralForm.placement_fee}
                onChange={(e) => setReferralForm(prev => ({ ...prev, placement_fee: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_notes">Notes</Label>
              <Textarea
                id="referral_notes"
                value={referralForm.notes}
                onChange={(e) => setReferralForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReferralDialogOpen(false);
              setReferralForm({ referrer_id: '', referred_user_id: '', placement_fee: '', notes: '' });
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateReferral}>Add Referral</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Component for inline editing of placement fees
const PlacementFeeCell = ({ 
  referralId, 
  currentFee, 
  onUpdate 
}: { 
  referralId: string; 
  currentFee?: number; 
  onUpdate: (id: string, fee: number) => void; 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentFee?.toString() || '');

  const handleSave = () => {
    const fee = parseFloat(value);
    if (!isNaN(fee)) {
      onUpdate(referralId, fee);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex gap-1">
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24"
        />
        <Button size="sm" onClick={handleSave}>Save</Button>
      </div>
    );
  }

  return (
    <div 
      className="cursor-pointer hover:bg-muted p-1 rounded"
      onClick={() => setIsEditing(true)}
    >
      {currentFee ? `R${currentFee.toFixed(2)}` : 'Click to add'}
    </div>
  );
};

export default AdminReferralProgram;
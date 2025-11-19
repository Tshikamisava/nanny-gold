import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Shield, User, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { format } from 'date-fns';

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  admin_level: string;
  permissions: any;
  created_at: string;
  last_login: string | null;
}

export const AdminUserManagement = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const { toast } = useToast();
  const { permissions, isSuperAdmin } = useAdminPermissions();

  const [newAdmin, setNewAdmin] = useState({
    email: '',
    first_name: '',
    last_name: '',
    department: '',
    admin_level: 'admin' as 'admin' | 'super_admin',
    permissions: {
      payments: false,
      analytics: false,
      professional_development: false,
      user_management: false,
      verification: true,
      support: true,
      bookings: true,
      nannies: true,
      clients: true,
    }
  });

  useEffect(() => {
    if (permissions.user_management || isSuperAdmin) {
      loadAdmins();
    }
  }, [permissions, isSuperAdmin]);

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select(`
          id,
          department,
          admin_level,
          permissions,
          created_at,
          last_login,
          profiles!inner(email, first_name, last_name)
        `);

      if (error) throw error;

      const formattedAdmins = data.map(admin => ({
        ...admin,
        email: admin.profiles.email,
        first_name: admin.profiles.first_name,
        last_name: admin.profiles.last_name,
      }));

      setAdmins(formattedAdmins);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.email || !newAdmin.first_name || !newAdmin.last_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // First create the user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newAdmin.email,
        password: Math.random().toString(36).slice(-12), // Temporary password
        email_confirm: true,
        user_metadata: {
          first_name: newAdmin.first_name,
          last_name: newAdmin.last_name,
          user_type: 'admin'
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin'
        });

      if (roleError) throw roleError;

      // Create admin profile
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          id: authData.user.id,
          department: newAdmin.department,
          admin_level: newAdmin.admin_level,
          permissions: newAdmin.permissions
        });

      if (adminError) throw adminError;

      toast({
        title: "Success",
        description: "Admin user created successfully. They will need to set up their password."
      });

      setShowCreateDialog(false);
      setNewAdmin({
        email: '',
        first_name: '',
        last_name: '',
        department: '',
        admin_level: 'admin',
        permissions: {
          payments: false,
          analytics: false,
          professional_development: false,
          user_management: false,
          verification: true,
          support: true,
          bookings: true,
          nannies: true,
          clients: true,
        }
      });
      loadAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: "Failed to create admin user",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      const { error } = await supabase
        .from('admins')
        .update({
          department: selectedAdmin.department,
          admin_level: selectedAdmin.admin_level,
          permissions: selectedAdmin.permissions
        })
        .eq('id', selectedAdmin.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin user updated successfully"
      });

      setShowEditDialog(false);
      setSelectedAdmin(null);
      loadAdmins();
    } catch (error) {
      console.error('Error updating admin:', error);
      toast({
        title: "Error",
        description: "Failed to update admin user",
        variant: "destructive"
      });
    }
  };

  // Check permissions
  if (!permissions.user_management && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-medium">Access Restricted</h3>
              <p className="text-muted-foreground">You don't have permission to manage admin users.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32">Loading...</div>;
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin User Management</h1>
          <p className="text-muted-foreground">Manage admin users and their permissions</p>
        </div>
        
        {isSuperAdmin && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>View and manage all admin users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">
                    {admin.first_name} {admin.last_name}
                  </TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.department}</TableCell>
                  <TableCell>
                    <Badge variant={admin.admin_level === 'super_admin' ? 'default' : 'secondary'}>
                      {admin.admin_level === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {admin.last_login ? format(new Date(admin.last_login), 'PPp') : 'Never'}
                  </TableCell>
                  <TableCell>
                    {(isSuperAdmin || admin.admin_level !== 'super_admin') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Admin</DialogTitle>
            <DialogDescription>
              Add a new administrator to the system with specific permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={newAdmin.first_name}
                  onChange={(e) => setNewAdmin({...newAdmin, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={newAdmin.last_name}
                  onChange={(e) => setNewAdmin({...newAdmin, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newAdmin.department}
                onChange={(e) => setNewAdmin({...newAdmin, department: e.target.value})}
                placeholder="e.g., Operations, Customer Service"
              />
            </div>
            
            <div>
              <Label htmlFor="admin_level">Admin Level</Label>
              <Select
                value={newAdmin.admin_level}
                onValueChange={(value: 'admin' | 'super_admin') => 
                  setNewAdmin({...newAdmin, admin_level: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Regular Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newAdmin.admin_level === 'admin' && (
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(newAdmin.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) =>
                          setNewAdmin({
                            ...newAdmin,
                            permissions: {
                              ...newAdmin.permissions,
                              [key]: !!checked
                            }
                          })
                        }
                      />
                      <Label htmlFor={key} className="text-sm capitalize">
                        {key.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin}>Create Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update admin permissions and settings.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAdmin && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit_department">Department</Label>
                <Input
                  id="edit_department"
                  value={selectedAdmin.department}
                  onChange={(e) => setSelectedAdmin({
                    ...selectedAdmin,
                    department: e.target.value
                  })}
                />
              </div>
              
              {isSuperAdmin && (
                <div>
                  <Label htmlFor="edit_admin_level">Admin Level</Label>
                  <Select
                    value={selectedAdmin.admin_level}
                    onValueChange={(value: 'admin' | 'super_admin') => 
                      setSelectedAdmin({
                        ...selectedAdmin,
                        admin_level: value
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Regular Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedAdmin.admin_level === 'admin' && (
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedAdmin.permissions || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit_${key}`}
                          checked={!!value}
                          onCheckedChange={(checked) =>
                            setSelectedAdmin({
                              ...selectedAdmin,
                              permissions: {
                                ...selectedAdmin.permissions,
                                [key]: !!checked
                              }
                            })
                          }
                        />
                        <Label htmlFor={`edit_${key}`} className="text-sm capitalize">
                          {key.replace('_', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAdmin}>Update Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
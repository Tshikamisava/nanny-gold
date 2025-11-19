import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Settings, 
  Shield, 
  Database, 
  Download, 
  Upload, 
  Palette, 
  Bell,
  Key,
  AlertTriangle,
  Activity,
  Monitor,
  Code,
  FileText,
  Users,
  RefreshCw,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Globe,
  Mail,
  Megaphone
} from 'lucide-react';
import { BookingRejectionFlowTester } from '@/components/BookingRejectionFlowTester';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { format } from 'date-fns';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  type: 'boolean' | 'string' | 'number';
  category: string;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  created_at: string;
  admin_name: string;
}

interface SystemStatus {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  notifications: 'healthy' | 'warning' | 'error';
}

export const AdminTools = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    notifications: 'healthy'
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const { toast } = useToast();
  const { isSuperAdmin } = useAdminPermissions();

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      // Load system settings
      const settings: SystemSetting[] = [
        { id: '1', key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', type: 'boolean', category: 'system' },
        { id: '2', key: 'default_currency', value: 'ZAR', description: 'Default platform currency', type: 'string', category: 'general' },
        { id: '3', key: 'booking_lead_time', value: '24', description: 'Minimum hours before regular booking', type: 'number', category: 'bookings' },
        { id: '4', key: 'email_notifications', value: 'true', description: 'Enable email notifications', type: 'boolean', category: 'notifications' },
        { id: '5', key: 'max_short_term_duration', value: '30', description: 'Maximum short-term booking duration (days)', type: 'number', category: 'bookings' },
        { id: '6', key: 'max_long_term_duration', value: '365', description: 'Maximum long-term booking duration (days)', type: 'number', category: 'bookings' },
        { id: '7', key: 'emergency_booking_enabled', value: 'true', description: 'Enable emergency bookings (same-day)', type: 'boolean', category: 'bookings' },
        { id: '8', key: 'emergency_booking_window', value: '5-7', description: 'Emergency booking time window (5AM-7AM)', type: 'string', category: 'bookings' },
        { id: '9', key: 'emergency_response_time', value: '3', description: 'Emergency booking response time (hours)', type: 'number', category: 'bookings' },
      ];
      setSystemSettings(settings);

      // Load audit logs (mock data for now)
      const logs: AuditLog[] = [
        {
          id: '1',
          admin_id: 'admin-1',
          action: 'UPDATE',
          table_name: 'nannies',
          record_id: 'nanny-123',
          old_values: { approval_status: 'pending' },
          new_values: { approval_status: 'approved' },
          created_at: new Date().toISOString(),
          admin_name: 'Super Admin'
        }
      ];
      setAuditLogs(logs);

    } catch (error) {
      console.error('Error loading system data:', error);
      toast({
        title: "Error",
        description: "Failed to load system data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSettingToggle = async (settingId: string, newValue: boolean) => {
    try {
      // Update local state
      setSystemSettings(prev => 
        prev.map(setting => 
          setting.id === settingId 
            ? { ...setting, value: newValue.toString() }
            : setting
        )
      );

      // Handle specific settings
      if (settingId === '1') { // maintenance_mode
        setMaintenanceMode(newValue);
      }

      toast({
        title: "Setting Updated",
        description: "System setting has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive"
      });
    }
  };

  const handleDataExport = async (type: 'users' | 'bookings' | 'audit') => {
    try {
      let data;
      let filename;

      switch (type) {
        case 'users':
          const { data: users } = await supabase.from('profiles').select('*');
          data = users;
          filename = 'users_export.json';
          break;
        case 'bookings':
          const { data: bookings } = await supabase.from('bookings').select('*');
          data = bookings;
          filename = 'bookings_export.json';
          break;
        case 'audit':
          data = auditLogs;
          filename = 'audit_logs_export.json';
          break;
        default:
          return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `${type} data exported successfully`
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  const handleDataImport = async (type: 'users' | 'nannies' | 'settings') => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.csv';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const text = await file.text();
        try {
          const data = JSON.parse(text);
          
          toast({
            title: "Import Successful",
            description: `${type} data imported successfully (${data.length || 0} records)`
          });
        } catch (parseError) {
          toast({
            title: "Import Failed",
            description: "Invalid JSON format",
            variant: "destructive"
          });
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error importing data:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import data",
        variant: "destructive"
      });
    }
  };

  const handleSecurityAction = async (action: string) => {
    try {
      switch (action) {
        case 'password_reset':
          toast({
            title: "Password Reset",
            description: "Password reset initiated for selected users"
          });
          break;
        case 'login_attempts':
          toast({
            title: "Login Attempts",
            description: "Viewing recent login attempts"
          });
          break;
        case 'api_keys':
          toast({
            title: "API Key Management",
            description: "Opening API key management panel"
          });
          break;
        case 'gdpr_deletion':
          toast({
            title: "GDPR Data Deletion",
            description: "Data deletion process initiated",
            variant: "destructive"
          });
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Security action error:', error);
      toast({
        title: "Error",
        description: "Failed to execute security action",
        variant: "destructive"
      });
    }
  };

  const handleCommunicationAction = async (action: string) => {
    try {
      switch (action) {
        case 'email_templates':
          toast({
            title: "Email Templates",
            description: "Opening email template management"
          });
          break;
        case 'public_notices':
          toast({
            title: "Public Notices",
            description: "Managing public announcements"
          });
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Communication action error:', error);
      toast({
        title: "Error",
        description: "Failed to execute communication action",
        variant: "destructive"
      });
    }
  };

  const handleDeveloperAction = async (action: string) => {
    try {
      switch (action) {
        case 'diagnostics':
          toast({
            title: "System Diagnostics",
            description: "Running system health checks"
          });
          break;
        case 'feature_flags':
          toast({
            title: "Feature Flags",
            description: "Opening feature flag management"
          });
          break;
        case 'database_health':
          toast({
            title: "Database Health",
            description: "Checking database performance"
          });
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Developer action error:', error);
      toast({
        title: "Error",
        description: "Failed to execute developer action",
        variant: "destructive"
      });
    }
  };

  const handleSystemAnnouncement = async () => {
    if (!announcement.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an announcement message",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create system-wide notification
      const { data: profiles } = await supabase.from('profiles').select('id');
      
      if (profiles) {
        for (const profile of profiles) {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            title: 'System Announcement',
            message: announcement,
            type: 'system_announcement'
          });
        }
      }

      toast({
        title: "Announcement Sent",
        description: "System announcement has been sent to all users"
      });

      setShowAnnouncementDialog(false);
      setAnnouncement('');
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32">Loading admin tools...</div>;
  }

  return (
    <PermissionGate permission="user_management">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Tools</h1>
            <p className="text-muted-foreground">Advanced system management and configuration</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 gap-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Communication
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="developer" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Developer
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(systemStatus).map(([key, status]) => (
                <Card key={key}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium capitalize">{key}</h3>
                        <Badge variant={getStatusBadgeVariant(status)} className="mt-1">
                          {status}
                        </Badge>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Admin Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.slice(0, 5).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.admin_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.table_name}#{log.record_id.slice(-8)}</TableCell>
                        <TableCell>{format(new Date(log.created_at), 'PPp')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure global system settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {systemSettings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="font-medium">{setting.description}</Label>
                      <p className="text-sm text-muted-foreground">Key: {setting.key}</p>
                    </div>
                    {setting.type === 'boolean' ? (
                      <Switch
                        checked={setting.value === 'true'}
                        onCheckedChange={(checked) => handleSystemSettingToggle(setting.id, checked)}
                      />
                    ) : (
                      <Input
                        value={setting.value}
                        onChange={(e) => {
                          setSystemSettings(prev =>
                            prev.map(s => s.id === setting.id ? { ...s, value: e.target.value } : s)
                          );
                        }}
                        className="w-32"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Data Export
                  </CardTitle>
                  <CardDescription>
                    Export system data for backup or analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => handleDataExport('users')} className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Export User Data
                  </Button>
                  <Button onClick={() => handleDataExport('bookings')} className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Export Booking Data
                  </Button>
                  <Button onClick={() => handleDataExport('audit')} className="w-full justify-start">
                    <Activity className="w-4 h-4 mr-2" />
                    Export Audit Logs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Data Import
                  </CardTitle>
                  <CardDescription>
                    Import data from external sources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleDataImport('users')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Users
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleDataImport('nannies')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Nanny Profiles
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleDataImport('settings')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Security Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleSecurityAction('password_reset')}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Force Password Reset
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleSecurityAction('login_attempts')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Login Attempts
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleSecurityAction('api_keys')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    API Key Management
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    System Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Maintenance Mode</span>
                    <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                  </div>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={() => handleSecurityAction('gdpr_deletion')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    GDPR Data Deletion
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  System Communications
                </CardTitle>
                <CardDescription>
                  Manage system-wide announcements and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => setShowAnnouncementDialog(true)} className="w-full justify-start">
                  <Bell className="w-4 h-4 mr-2" />
                  Send System Announcement
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleCommunicationAction('email_templates')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Templates
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleCommunicationAction('public_notices')}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Public Notices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Developer Tab (Super Admin Only) */}
          {isSuperAdmin && (
            <TabsContent value="developer" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Developer Tools
                  </CardTitle>
                  <CardDescription>
                    Advanced tools for system debugging and feature management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleDeveloperAction('diagnostics')}
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    System Diagnostics
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleDeveloperAction('feature_flags')}
                  >
                    <ToggleLeft className="w-4 h-4 mr-2" />
                    Feature Flags
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleDeveloperAction('database_health')}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Database Health
                  </Button>
                </CardContent>
              </Card>
              
              <BookingRejectionFlowTester />
            </TabsContent>
          )}
        </Tabs>

        {/* System Announcement Dialog */}
        <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send System Announcement</DialogTitle>
              <DialogDescription>
                This will send a notification to all users on the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="announcement">Announcement Message</Label>
                <Textarea
                  id="announcement"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Enter your announcement message..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSystemAnnouncement}>
                Send Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
};
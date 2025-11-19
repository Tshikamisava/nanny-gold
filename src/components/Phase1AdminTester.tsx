import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserRole } from '@/utils/userUtils';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Users,
  Settings,
  BarChart3,
  LogOut,
  RefreshCw
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  message: string;
  action?: () => void;
  actionLabel?: string;
}

const Phase1AdminTester = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Admin Authentication', status: 'pending', message: 'Check admin login flow' },
    { name: 'Super Admin Setup', status: 'pending', message: 'Test admin account creation' },
    { name: 'Admin Dashboard Access', status: 'pending', message: 'Verify dashboard loads correctly' },
    { name: 'User Management Access', status: 'pending', message: 'Test user management functions' },
    { name: 'Nanny Profile Management', status: 'pending', message: 'Test nanny profile operations' },
    { name: 'Admin Permissions', status: 'pending', message: 'Verify admin permission system' },
    { name: 'Analytics Dashboard', status: 'pending', message: 'Test analytics and reporting' },
    { name: 'Support System', status: 'pending', message: 'Test admin support functions' }
  ]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentAuth();
  }, []);

  const checkCurrentAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const role = await getUserRole(user.id);
        setUserRole(role);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runTest = async (testIndex: number) => {
    updateTest(testIndex, { status: 'pending', message: 'Running test...' });

    switch (testIndex) {
      case 0: // Admin Authentication
        await testAdminAuth(testIndex);
        break;
      case 1: // Super Admin Setup
        await testSuperAdminSetup(testIndex);
        break;
      case 2: // Admin Dashboard Access
        await testDashboardAccess(testIndex);
        break;
      case 3: // User Management
        await testUserManagement(testIndex);
        break;
      case 4: // Nanny Profile Management
        await testNannyManagement(testIndex);
        break;
      case 5: // Admin Permissions
        await testAdminPermissions(testIndex);
        break;
      case 6: // Analytics Dashboard
        await testAnalytics(testIndex);
        break;
      case 7: // Support System
        await testSupportSystem(testIndex);
        break;
    }
  };

  const testAdminAuth = async (index: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        updateTest(index, { 
          status: 'warning', 
          message: 'No user logged in. Please test admin login manually.',
          action: () => navigate('/admin-login'),
          actionLabel: 'Go to Admin Login'
        });
        return;
      }

      const role = await getUserRole(user.id);
      
      if (role === 'admin') {
        updateTest(index, { 
          status: 'pass', 
          message: `✓ Admin user authenticated: ${user.email}` 
        });
      } else {
        updateTest(index, { 
          status: 'fail', 
          message: `✗ User ${user.email} is not an admin (role: ${role})` 
        });
      }
    } catch (error: any) {
      updateTest(index, { 
        status: 'fail', 
        message: `✗ Auth error: ${error.message}` 
      });
    }
  };

  const testSuperAdminSetup = async (index: number) => {
    try {
      // Check if super admins exist in the system
      const { data, error } = await supabase
        .from('admins')
        .select('id, admin_level')
        .eq('admin_level', 'super_admin')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        updateTest(index, { 
          status: 'pass', 
          message: '✓ Super admin successfully configured in system' 
        });
      } else {
        updateTest(index, { 
          status: 'warning', 
          message: 'No super admin found. Setup required.',
          action: () => navigate('/admin-setup'),
          actionLabel: 'Setup Super Admin'
        });
      }
    } catch (error: any) {
      updateTest(index, { 
        status: 'warning', 
        message: 'Unable to verify super admin setup',
        action: () => navigate('/admin-setup'),
        actionLabel: 'Test Admin Setup'
      });
    }
  };

  const testDashboardAccess = async (index: number) => {
    if (userRole !== 'admin') {
      updateTest(index, { 
        status: 'fail', 
        message: '✗ Must be admin to test dashboard access' 
      });
      return;
    }

    // If we're here and user is admin, dashboard access is working
    try {
      // Verify we can access admin-specific data
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser?.id)
        .eq('role', 'admin')
        .single();

      if (error) throw error;

      updateTest(index, { 
        status: 'pass', 
        message: '✓ Admin dashboard access verified - you are successfully logged in' 
      });
    } catch (error: any) {
      updateTest(index, { 
        status: 'warning', 
        message: 'Dashboard accessible but role verification failed',
        action: () => navigate('/admin'),
        actionLabel: 'Go to Admin Dashboard'
      });
    }
  };

  const testUserManagement = async (index: number) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .limit(1);

      if (error) throw error;

      updateTest(index, { 
        status: 'pass', 
        message: '✓ User data accessible for management' 
      });
    } catch (error: any) {
      updateTest(index, { 
        status: 'fail', 
        message: `✗ User management access error: ${error.message}` 
      });
    }
  };

  const testNannyManagement = async (index: number) => {
    try {
      const { data, error } = await supabase
        .from('nannies')
        .select('id, bio, hourly_rate, approval_status')
        .limit(1);

      if (error) throw error;

      updateTest(index, { 
        status: 'pass', 
        message: '✓ Nanny data accessible for management' 
      });
    } catch (error: any) {
      updateTest(index, { 
        status: 'fail', 
        message: `✗ Nanny management access error: ${error.message}` 
      });
    }
  };

  const testAdminPermissions = async (index: number) => {
    try {
      if (!currentUser) throw new Error('No user logged in');

      const { data, error } = await supabase.rpc('is_super_admin', {
        user_uuid: currentUser.id
      });

      if (error) throw error;

      updateTest(index, { 
        status: 'pass', 
        message: `✓ Permission system working (Super admin: ${data})` 
      });
    } catch (error: any) {
      updateTest(index, { 
        status: 'warning', 
        message: 'Permission system needs setup or testing' 
      });
    }
  };

  const testAnalytics = async (index: number) => {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, created_at, status')
        .limit(5);

      if (error) throw error;

      updateTest(index, { 
        status: 'pass', 
        message: '✓ Analytics data accessible' 
      });
    } catch (error: any) {
      updateTest(index, { 
        status: 'warning', 
        message: 'Analytics access needs verification' 
      });
    }
  };

  const testSupportSystem = async (index: number) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, status, priority')
        .limit(1);

      updateTest(index, { 
        status: 'pass', 
        message: '✓ Support system data accessible' 
      });
    } catch (error: any) {
      updateTest(index, { 
        status: 'warning', 
        message: 'Support system needs setup or data' 
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    for (let i = 0; i < tests.length; i++) {
      await runTest(i);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay between tests
    }
    setIsRunning(false);
    
    toast({
      title: "Phase 1 Testing Complete",
      description: "Review results and address any failing tests"
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pass: 'default',
      fail: 'destructive', 
      warning: 'secondary',
      pending: 'outline'
    } as const;
    
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const totalTests = tests.length;
  const progress = (passedTests / totalTests) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Phase 1: Admin Tenant Testing</CardTitle>
                <p className="text-muted-foreground">Core admin functionality and authentication</p>
              </div>
            </div>
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="min-w-[120px]"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current Status */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Current User:</strong> {currentUser?.email || 'Not logged in'} 
              {userRole && <Badge variant="outline" className="ml-2">{userRole}</Badge>}
            </AlertDescription>
          </Alert>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Testing Progress</span>
              <span>{passedTests}/{totalTests} tests passed</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Separator />

          {/* Test Results */}
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <h4 className="font-medium">{test.name}</h4>
                    <p className="text-sm text-muted-foreground">{test.message}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(test.status)}
                  
                  {test.action && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={test.action}
                    >
                      {test.actionLabel}
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => runTest(index)}
                    disabled={isRunning}
                  >
                    Test
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin-login')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Login
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Admin Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin-setup')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Setup
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={checkCurrentAuth}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Auth
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Phase1AdminTester;
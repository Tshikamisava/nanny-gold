import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserCleanup } from '@/components/UserCleanup';

export default function AdminUserFixer() {
  const [email, setEmail] = useState('tefonannytest@gmail.com');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkUser = async () => {
    setLoading(true);
    try {
      // Check nanny record
      const { data: nannyData } = await supabase
        .from('nannies')
        .select(`
          *,
          profiles(*)
        `)
        .eq('profiles.email', email)
        .maybeSingle();

      // Check auth user existence
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

      setUserInfo({
        nanny: nannyData,
        profiles: profiles,
        email: email
      });

    } catch (error) {
      console.error('Error checking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to check user status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fixUserIssues = async () => {
    if (!userInfo?.nanny) return;

    try {
      // Reset nanny to pending status
      const { error } = await supabase
        .from('nannies')
        .update({ 
          approval_status: 'pending',
          admin_notes: 'Reset by admin - user issue resolution',
          updated_at: new Date().toISOString()
        })
        .eq('id', userInfo.nanny.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User status reset to pending. They can now reset password.',
      });

      checkUser(); // Refresh data
    } catch (error) {
      console.error('Error fixing user:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix user issues',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Issue Resolver</h1>
        <p className="text-muted-foreground">
          Diagnose and fix user authentication and profile issues
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={checkUser} disabled={loading || !email}>
              {loading ? 'Checking...' : 'Check User'}
            </Button>
          </div>

          {userInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userInfo.profiles?.length > 0 ? (
                      <div className="space-y-2">
                        <Badge variant="default">Profile Exists</Badge>
                        <p>ID: {userInfo.profiles[0].id}</p>
                        <p>Name: {userInfo.profiles[0].first_name} {userInfo.profiles[0].last_name}</p>
                        <p>Type: {userInfo.profiles[0].user_type}</p>
                      </div>
                    ) : (
                      <Badge variant="destructive">No Profile Found</Badge>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Nanny Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userInfo.nanny ? (
                      <div className="space-y-2">
                        <Badge variant={userInfo.nanny.approval_status === 'approved' ? 'default' : 
                                     userInfo.nanny.approval_status === 'pending' ? 'secondary' : 'destructive'}>
                          {userInfo.nanny.approval_status}
                        </Badge>
                        <p>Monthly Rate: R{userInfo.nanny.monthly_rate}</p>
                        <p>Available: {userInfo.nanny.is_available ? 'Yes' : 'No'}</p>
                        <p>Verified: {userInfo.nanny.is_verified ? 'Yes' : 'No'}</p>
                        {userInfo.nanny.admin_notes && (
                          <p className="text-sm text-muted-foreground">
                            Notes: {userInfo.nanny.admin_notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="destructive">No Nanny Record</Badge>
                    )}
                  </CardContent>
                </Card>
              </div>

              {userInfo.nanny?.approval_status === 'rejected' && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-yellow-800">Issue Detected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-yellow-700 mb-4">
                      This user is in "rejected" status, which prevents password reset and normal authentication.
                    </p>
                    <Button onClick={fixUserIssues} variant="outline">
                      Reset to Pending Status
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Cleanup Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <UserCleanup />
        </CardContent>
      </Card>
    </div>
  );
}
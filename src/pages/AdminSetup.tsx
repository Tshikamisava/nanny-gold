import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';

const AdminSetup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-super-admin', {
        body: { admin_email: email }
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: "Admin Account Created",
        description: `Successfully set up admin account for ${email}`,
      });
    } catch (error: any) {
      console.error('Error setting up admin:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup admin account",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Account Setup</CardTitle>
          <p className="text-muted-foreground">
            Promote an existing user to super admin
          </p>
        </CardHeader>
        
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Setup Complete!</h3>
                <p className="text-muted-foreground">
                  The user has been promoted to super admin
                </p>
              </div>
              <Button 
                onClick={() => navigate('/admin-login')} 
                className="w-full"
              >
                Go to Admin Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSetupAdmin} className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The user with this email must already have an account. This will promote them to super admin.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email of existing user"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Setting Up...' : 'Setup Admin Account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const UserCleanup = () => {
  const [email, setEmail] = useState('care@nannygold.co.za');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-incomplete-user', {
        body: { email }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Cleanup completed',
        description: data.message,
        variant: data.cleanedUp ? 'default' : 'destructive'
      });
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: 'Cleanup failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>User Cleanup Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button 
          onClick={handleCleanup} 
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? 'Cleaning up...' : 'Check & Cleanup User'}
        </Button>
        
        {result && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
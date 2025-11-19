import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Database, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TestDataManager() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [testDataStatus, setTestDataStatus] = useState<'unknown' | 'ready' | 'missing'>('unknown');
  const [testBookingCount, setTestBookingCount] = useState<number>(0);
  const [lastOperation, setLastOperation] = useState<{
    type: 'generate' | 'cleanup';
    success: boolean;
    message: string;
  } | null>(null);

  const checkTestDataStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('services->>test_data', 'true');

      if (error) throw error;

      const count = data?.length || 0;
      setTestBookingCount(count);
      setTestDataStatus(count === 43 ? 'ready' : 'missing');

      return count;
    } catch (error) {
      console.error('Error checking test data:', error);
      return 0;
    }
  };

  const generateTestData = async () => {
    setIsGenerating(true);
    setLastOperation(null);

    try {
      toast.info('Generating 43 test bookings...', { duration: 3000 });

      const { data, error } = await supabase.functions.invoke('generate-test-bookings-fixed');

      if (error) throw error;

      setLastOperation({
        type: 'generate',
        success: true,
        message: `Successfully created ${data.bookings_created} test bookings`,
      });

      toast.success(`Created ${data.bookings_created}/43 test bookings!`);
      
      await checkTestDataStatus();
    } catch (error: any) {
      console.error('Error generating test data:', error);
      setLastOperation({
        type: 'generate',
        success: false,
        message: error.message || 'Failed to generate test bookings',
      });
      toast.error('Failed to generate test bookings');
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanupTestData = async () => {
    setIsCleaning(true);
    setLastOperation(null);

    try {
      toast.info('Cleaning up test bookings...', { duration: 2000 });

      const { data, error } = await supabase.functions.invoke('cleanup-test-bookings');

      if (error) throw error;

      setLastOperation({
        type: 'cleanup',
        success: true,
        message: `Successfully deleted ${data.deleted_bookings} test bookings and ${data.deleted_profiles} test profiles`,
      });

      toast.success('Test data cleaned up successfully!');
      
      await checkTestDataStatus();
    } catch (error: any) {
      console.error('Error cleaning up test data:', error);
      setLastOperation({
        type: 'cleanup',
        success: false,
        message: error.message || 'Failed to cleanup test bookings',
      });
      toast.error('Failed to cleanup test bookings');
    } finally {
      setIsCleaning(false);
    }
  };

  // Check status on mount
  useState(() => {
    checkTestDataStatus();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Test Data Management
        </CardTitle>
        <CardDescription>
          Manage the 43 test bookings required for Phase 7 scenario testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Test Data Status</p>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  testDataStatus === 'ready'
                    ? 'default'
                    : testDataStatus === 'missing'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {testDataStatus === 'ready' && <CheckCircle className="w-3 h-3 mr-1" />}
                {testDataStatus === 'missing' && <AlertCircle className="w-3 h-3 mr-1" />}
                {testDataStatus === 'ready'
                  ? 'Ready'
                  : testDataStatus === 'missing'
                  ? 'Missing'
                  : 'Unknown'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {testBookingCount}/43 test bookings
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkTestDataStatus}
            disabled={isGenerating || isCleaning}
          >
            Refresh Status
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={generateTestData}
            disabled={isGenerating || isCleaning}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Generate Test Data
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            onClick={cleanupTestData}
            disabled={isGenerating || isCleaning}
            className="w-full"
          >
            {isCleaning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Cleanup Test Data
              </>
            )}
          </Button>
        </div>

        {/* Last Operation Result */}
        {lastOperation && (
          <Alert variant={lastOperation.success ? 'default' : 'destructive'}>
            {lastOperation.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{lastOperation.message}</AlertDescription>
          </Alert>
        )}

        {/* Information */}
        <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
          <p className="font-medium">What happens when you generate test data:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Creates 2 test profiles (client & nanny)</li>
            <li>Generates all 43 scenario-specific test bookings</li>
            <li>Calculates accurate financial data for each booking</li>
            <li>Tags all data with test_data: true for easy cleanup</li>
          </ul>
          <p className="font-medium mt-4">Safety features:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Test data is isolated from production bookings</li>
            <li>One-click cleanup removes all test data</li>
            <li>No production data is modified</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

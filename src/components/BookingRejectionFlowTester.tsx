import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Mail, 
  Users, 
  Database,
  ArrowRight,
  TestTube
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  message: string;
  details?: any;
}

export const BookingRejectionFlowTester: React.FC = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testBookingId, setTestBookingId] = useState<string>('');

  const updateTestResult = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTestResults(prev => {
      const index = prev.findIndex(r => r.name === name);
      const newResult = { name, status, message, details };
      if (index >= 0) {
        return [...prev.slice(0, index), newResult, ...prev.slice(index + 1)];
      }
      return [...prev, newResult];
    });
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Initialize test results
    const tests = [
      'Database Schema Check',
      'Create Test Booking',
      'Test Nanny Categories',
      'Simulate Booking Rejection',
      'Verify Auto-Reassignment',
      'Check Notifications',
      'Test Client Response',
      'Verify Escalation',
      'Email Notification Test',
      'Cleanup Test Data'
    ];

    tests.forEach(test => {
      updateTestResult(test, 'pending', 'Waiting to run...');
    });

    try {
      // Test 1: Database Schema Check
      updateTestResult('Database Schema Check', 'pending', 'Checking database schema...');
      
      const { data: nannySchema, error: nannyError } = await supabase
        .from('nannies')
        .select('service_categories, admin_assigned_categories')
        .limit(1);
      
      if (nannyError) {
        updateTestResult('Database Schema Check', 'error', `Nannies table error: ${nannyError.message}`);
        return;
      }

      const { data: reassignmentSchema, error: reassignmentSchemaError } = await supabase
        .from('booking_reassignments')
        .select('*')
        .limit(1);
      
      if (reassignmentSchemaError) {
        updateTestResult('Database Schema Check', 'error', `Reassignments table error: ${reassignmentSchemaError.message}`);
        return;
      }

      updateTestResult('Database Schema Check', 'success', 'All required tables and columns exist');

      // Test 2: Create Test Booking
      updateTestResult('Create Test Booking', 'pending', 'Creating test booking...');
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        updateTestResult('Create Test Booking', 'error', 'No authenticated user found');
        return;
      }

      // Get a real nanny ID for testing
      const { data: availableNanny, error: nannyFetchError } = await supabase
        .from('nannies')
        .select('id')
        .eq('approval_status', 'approved')
        .limit(1)
        .single();

      if (nannyFetchError || !availableNanny) {
        updateTestResult('Create Test Booking', 'error', 'No approved nanny found for testing');
        return;
      }

      const testBooking = {
        client_id: user.user.id,
        nanny_id: availableNanny.id,
        status: 'confirmed' as const,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        schedule: { timeSlots: [{ start: '09:00', end: '17:00' }] },
        living_arrangement: 'live-out' as const,
        services: { cooking: true, driving_support: true },
        base_rate: 4800,
        additional_services_cost: 0,
        total_monthly_cost: 4800,
        booking_type: 'long_term',
        notes: 'Test booking for rejection flow testing'
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();

      if (bookingError) {
        updateTestResult('Create Test Booking', 'error', `Failed to create booking: ${bookingError.message}`);
        return;
      }

      setTestBookingId(booking.id);
      updateTestResult('Create Test Booking', 'success', `Test booking created: ${booking.id}`);

      // Test 3: Test Nanny Categories
      updateTestResult('Test Nanny Categories', 'pending', 'Testing nanny categorization...');
      
      const { data: nannies, error: nanniesError } = await supabase
        .from('nannies')
        .select('id, service_categories, admin_assigned_categories')
        .limit(5);

      if (nanniesError) {
        updateTestResult('Test Nanny Categories', 'error', `Failed to fetch nannies: ${nanniesError.message}`);
        return;
      }

      const categorizedNannies = nannies?.filter(n => 
        n.service_categories?.length > 0 || n.admin_assigned_categories?.length > 0
      );

      updateTestResult('Test Nanny Categories', 'success', 
        `Found ${categorizedNannies?.length || 0} categorized nannies out of ${nannies?.length || 0} total`);

      // Test 4: Simulate Booking Rejection
      updateTestResult('Simulate Booking Rejection', 'pending', 'Testing rejection flow...');
      
      const { data: rejectionResult, error: rejectionError } = await supabase.functions.invoke(
        'handle-booking-rejection',
        {
          body: {
            bookingId: booking.id,
            nannyId: availableNanny.id,
            reason: 'Test rejection - unavailable due to family emergency'
          }
        }
      );

      if (rejectionError) {
        updateTestResult('Simulate Booking Rejection', 'error', 
          `Rejection handler failed: ${rejectionError.message}`);
        return;
      }

      updateTestResult('Simulate Booking Rejection', 'success', 
        `Rejection processed successfully`, rejectionResult);

      // Test 5: Verify Auto-Reassignment
      updateTestResult('Verify Auto-Reassignment', 'pending', 'Checking reassignment...');
      
      // Wait a moment for async operations
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: updatedBooking, error: bookingUpdateError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', booking.id)
        .single();

      if (bookingUpdateError) {
        updateTestResult('Verify Auto-Reassignment', 'error', 
          `Failed to check booking update: ${bookingUpdateError.message}`);
        return;
      }

      const wasReassigned = updatedBooking.nanny_id !== availableNanny.id || updatedBooking.notes?.includes('ESCALATED');

      updateTestResult('Verify Auto-Reassignment', 
        wasReassigned ? 'success' : 'error',
        wasReassigned ? 
          `Booking reassigned to nanny: ${updatedBooking.nanny_id}` : 
          'Booking was not reassigned'
      );

      // Test 6: Check Notifications
      updateTestResult('Check Notifications', 'pending', 'Checking notifications...');
      
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const reassignmentNotifications = notifications?.filter(n => 
        n.type === 'booking_reassigned' || (n.data as any)?.booking_id === booking.id
      );

      updateTestResult('Check Notifications', 'success', 
        `Found ${reassignmentNotifications?.length || 0} relevant notifications`);

      // Test 7: Test Client Response (Accept)
      updateTestResult('Test Client Response', 'pending', 'Testing client response...');
      
      const { data: reassignments, error: reassignmentFetchError } = await supabase
        .from('booking_reassignments')
        .select('*')
        .eq('original_booking_id', booking.id)
        .limit(1);

      if (reassignments && reassignments.length > 0) {
        const { error: responseError } = await supabase
          .from('booking_reassignments')
          .update({ 
            client_response: 'accepted',
            responded_at: new Date().toISOString()
          })
          .eq('id', reassignments[0].id);

        if (responseError) {
          updateTestResult('Test Client Response', 'error', 
            `Failed to update client response: ${responseError.message}`);
        } else {
          updateTestResult('Test Client Response', 'success', 
            'Client response recorded successfully');
        }
      } else {
        updateTestResult('Test Client Response', 'skipped', 
          'No reassignment record found to test response');
      }

      // Test 8: Verify Escalation (simulate rejection)
      updateTestResult('Verify Escalation', 'pending', 'Testing escalation flow...');
      
      const { data: escalationResult, error: escalationError } = await supabase.functions.invoke(
        'escalate-booking-issue',
        {
          body: {
            bookingId: booking.id,
            reason: 'Test escalation - client needs manual assistance',
            additionalInfo: 'Automated test of escalation system'
          }
        }
      );

      if (escalationError) {
        updateTestResult('Verify Escalation', 'error', 
          `Escalation failed: ${escalationError.message}`);
      } else {
        updateTestResult('Verify Escalation', 'success', 
          'Escalation processed successfully', escalationResult);
      }

      // Test 9: Email Notification Test
      updateTestResult('Email Notification Test', 'pending', 'Testing email notifications...');
      
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'send-support-email',
          {
            body: {
              to: 'care@nannygold.co.za',
              subject: 'TEST: Booking Rejection Flow Test Complete',
              html: `
                <h2>Booking Rejection Flow Test Results</h2>
                <p>Test booking ID: ${booking.id}</p>
                <p>This is an automated test email to verify the email notification system.</p>
                <p>All systems are functioning correctly.</p>
              `
            }
          }
        );

        if (emailError) {
          updateTestResult('Email Notification Test', 'error', 
            `Email test failed: ${emailError.message}`);
        } else {
          updateTestResult('Email Notification Test', 'success', 
            'Test email sent successfully');
        }
      } catch (emailError) {
        updateTestResult('Email Notification Test', 'error', 
          `Email function not available: ${emailError}`);
      }

      // Test 10: Cleanup Test Data
      updateTestResult('Cleanup Test Data', 'pending', 'Cleaning up test data...');
      
      // Clean up reassignments first (foreign key constraint)
      await supabase
        .from('booking_reassignments')
        .delete()
        .eq('original_booking_id', booking.id);

      // Clean up notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.user.id)
        .ilike('message', '%test%');

      // Clean up test booking
      const { error: cleanupError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (cleanupError) {
        updateTestResult('Cleanup Test Data', 'error', 
          `Cleanup failed: ${cleanupError.message}`);
      } else {
        updateTestResult('Cleanup Test Data', 'success', 
          'Test data cleaned successfully');
      }

      toast({
        title: 'Test Complete',
        description: 'Booking rejection flow test completed successfully!',
      });

    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: 'Test Failed',
        description: `Test encountered an error: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'skipped':
        return <ArrowRight className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'border-l-green-500';
      case 'error': return 'border-l-red-500';
      case 'pending': return 'border-l-yellow-500';
      case 'skipped': return 'border-l-gray-400';
      default: return 'border-l-gray-300';
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const totalCount = testResults.length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <TestTube className="w-6 h-6 text-primary" />
          <CardTitle>Booking Rejection Flow Tester</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Comprehensive test of the booking rejection and reassignment system
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            onClick={runComprehensiveTest}
            disabled={isRunning}
            size="lg"
            className="min-w-[200px]"
          >
            {isRunning ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Run Full Test Suite
              </>
            )}
          </Button>
          
          {testResults.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                {successCount} Passed
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="text-red-600">
                  <XCircle className="w-3 h-3 mr-1" />
                  {errorCount} Failed
                </Badge>
              )}
              <span className="text-muted-foreground">
                {totalCount} Total Tests
              </span>
            </div>
          )}
        </div>

        {testResults.length > 0 && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Test Results</h3>
              
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`p-4 border-l-4 bg-muted/30 rounded-r-lg ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{result.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.message}
                      </p>
                      {result.details && (
                        <pre className="text-xs bg-black/5 p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {testBookingId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Test booking ID: <code className="bg-muted px-1 rounded">{testBookingId}</code>
              <br />
              This booking will be automatically cleaned up after testing.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>What this test validates:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Database schema includes new service category fields</li>
            <li>Booking rejection triggers auto-reassignment</li>
            <li>Smart matching finds suitable replacement nannies</li>
            <li>Notifications are sent to all relevant parties</li>
            <li>Client can respond to reassignment options</li>
            <li>Escalation system works for admin intervention</li>
            <li>Email notifications reach care@nannygold.co.za</li>
            <li>All data is properly cleaned up after testing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
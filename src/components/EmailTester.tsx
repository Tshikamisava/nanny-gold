import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendNannyGoldEmail } from '@/services/emailService';
import { Mail, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface EmailTesterProps {
  userRole: 'client' | 'nanny' | 'admin';
}

export default function EmailTester({ userRole }: EmailTesterProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResults, setTestResults] = useState<{
    timestamp: string;
    success: boolean;
    message: string;
    details?: any;
  }[]>([]);

  const runEmailTest = async () => {
    if (!testEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter a test email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const timestamp = new Date().toISOString();

    try {
      console.log('🧪 Starting email test...');

      const result = await sendNannyGoldEmail({
        to: [testEmail],
        from: 'care',
        subject: `NannyGold Email Test - ${new Date().toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f59e0b;">NannyGold Email Test</h2>
            <p>This is a test email to verify that the NannyGold email system is working correctly.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>Test Details:</h3>
              <ul>
                <li><strong>Timestamp:</strong> ${timestamp}</li>
                <li><strong>User Role:</strong> ${userRole}</li>
                <li><strong>Test Type:</strong> Email Functionality Test</li>
              </ul>
            </div>
            <p>If you received this email, the NannyGold email system is working properly!</p>
            <p style="color: #6b7280; font-size: 14px;">This is an automated test email.</p>
          </div>
        `,
      });

      const successResult = {
        timestamp,
        success: true,
        message: 'Email sent successfully!',
        details: result
      };

      setTestResults(prev => [successResult, ...prev.slice(0, 9)]); // Keep last 10 results

      toast({
        title: 'Test Email Sent',
        description: `Test email sent to ${testEmail}`,
      });

    } catch (error) {
      console.error('❌ Email test failed:', error);

      const errorResult = {
        timestamp,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      };

      setTestResults(prev => [errorResult, ...prev.slice(0, 9)]);

      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Email test failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Email Functionality Test
          </CardTitle>
          <CardDescription>
            Test the NannyGold email system to ensure emails are being sent correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="your-email@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter your email address to receive a test email
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runEmailTest}
              disabled={loading || !testEmail}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Test Email...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>

            {testResults.length > 0 && (
              <Button
                variant="outline"
                onClick={clearResults}
              >
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Recent email test results (last 10 tests)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.message}
                  </p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        Show details
                      </summary>
                      <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium mb-1">Common Issues:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• <strong>RESEND_API_KEY not configured:</strong> Check Supabase project settings</li>
              <li>• <strong>Email goes to spam:</strong> Check spam folder, this is normal for test emails</li>
              <li>• <strong>Authentication error:</strong> Make sure you're logged in</li>
              <li>• <strong>Network issues:</strong> Check your internet connection</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-1">Email Addresses:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• <strong>Care:</strong> care@nannygold.co.za</li>
              <li>• <strong>Bespoke:</strong> bespoke@nannygold.co.za</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
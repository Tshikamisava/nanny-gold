import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, ExternalLink, CheckCircle } from 'lucide-react';
import { isDemoMode } from '@/integrations/supabase/client';

export const DemoModeIndicator: React.FC = () => {
  if (!isDemoMode) return null;

  return (
    <Alert className="mb-4 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800 font-semibold">🎭 Demo Mode Active</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p className="text-blue-700">
            You're using the app with mock data. All features work perfectly for testing!
          </p>
          
          <div className="text-sm text-blue-600 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Login with any email/password</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Full dashboard with sample bookings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>All booking and nanny features</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                  newWindow.document.write(`
                    <html>
                      <head><title>Supabase Setup Guide</title></head>
                      <body style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto;">
                        <h1>🚀 Quick Supabase Setup Guide</h1>
                        <h2>Step 1: Create Project</h2>
                        <ol>
                          <li>Go to <a href="https://supabase.com" target="_blank">supabase.com</a></li>
                          <li>Sign up/Sign in</li>
                          <li>Click "New Project"</li>
                          <li>Name: nanny-gold</li>
                          <li>Wait ~2 minutes for setup</li>
                        </ol>
                        <h2>Step 2: Get Credentials</h2>
                        <ol>
                          <li>Go to Settings → API</li>
                          <li>Copy Project URL</li>
                          <li>Copy anon/public key</li>
                        </ol>
                        <h2>Step 3: Update .env File</h2>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-actual-anon-key...
                        </pre>
                        <h2>Step 4: Restart Server</h2>
                        <p>Run: <code>npm run dev</code></p>
                        <p><strong>That's it! 🎉 Your app will connect to real Supabase.</strong></p>
                      </body>
                    </html>
                  `);
                  newWindow.document.close();
                }
              }}
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Setup Real Database
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                console.log('🎭 NannyGold Demo Mode Info:');
                console.log('📱 All features work with mock data');
                console.log('🔐 Login: Use any email/password combination');
                console.log('📊 Dashboard: Shows simulated bookings and data');
                console.log('🎯 Perfect for testing and demos');
                console.log('📚 Check the setup guide to connect real Supabase');
                alert('Demo mode info logged to console! Press F12 to see details.');
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Learn More
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DemoModeIndicator;
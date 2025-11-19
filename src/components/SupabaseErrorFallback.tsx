import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

interface SupabaseErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

export const SupabaseErrorFallback: React.FC<SupabaseErrorFallbackProps> = ({
  error,
  onRetry
}) => {
  const isNetworkError = error?.message?.includes('ERR_NAME_NOT_RESOLVED') ||
                        error?.message?.includes('fetch') ||
                        error?.message?.includes('network');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Service Unavailable</CardTitle>
          <CardDescription>
            We're experiencing technical difficulties connecting to our services.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="mt-2">
              {isNetworkError 
                ? "Unable to connect to our servers. This could be due to network issues or temporary service maintenance."
                : "An unexpected error occurred while connecting to our backend services."
              }
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">What you can try:</h4>
            <ul className="text-sm text-muted-foreground space-y-2 ml-4">
              <li>• Check your internet connection</li>
              <li>• Try refreshing the page</li>
              <li>• Wait a few minutes and try again</li>
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="flex-1"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
            
            {onRetry && (
              <Button onClick={onRetry} className="flex-1">
                Try Again
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              If you continue experiencing issues, please contact our support team.
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 text-xs"
              onClick={() => window.open('mailto:support@nannygold.com', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseErrorFallback;
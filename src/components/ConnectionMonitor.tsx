import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { checkSupabaseConnection } from '@/integrations/supabase/client';

interface ConnectionMonitorProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export const ConnectionMonitor: React.FC<ConnectionMonitorProps> = ({ 
  onConnectionChange 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const checkConnections = async () => {
    setIsChecking(true);
    
    // Check basic internet connectivity
    const online = navigator.onLine;
    setIsOnline(online);
    
    if (online) {
      // Check Supabase connectivity
      const supabaseConnected = await checkSupabaseConnection();
      setIsSupabaseConnected(supabaseConnected);
      
      const overallConnected = online && supabaseConnected;
      setShowAlert(!overallConnected);
      onConnectionChange?.(overallConnected);
    } else {
      setIsSupabaseConnected(false);
      setShowAlert(true);
      onConnectionChange?.(false);
    }
    
    setIsChecking(false);
  };

  useEffect(() => {
    // Initial check
    checkConnections();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      checkConnections();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setIsSupabaseConnected(false);
      setShowAlert(true);
      onConnectionChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check every 30 seconds
    const interval = setInterval(checkConnections, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [onConnectionChange]);

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (isSupabaseConnected === false) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusMessage = () => {
    if (!isOnline) {
      return "No internet connection. Please check your network.";
    }
    
    if (isSupabaseConnected === false) {
      return "Unable to connect to our servers. Some features may not work properly.";
    }
    
    return null;
  };

  if (!showAlert) return null;

  const statusMessage = getStatusMessage();
  if (!statusMessage) return null;

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <AlertDescription className="flex-1">
          {statusMessage}
        </AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkConnections}
          disabled={isChecking}
          className="ml-2"
        >
          {isChecking ? 'Checking...' : 'Retry'}
        </Button>
      </div>
    </Alert>
  );
};

export default ConnectionMonitor;
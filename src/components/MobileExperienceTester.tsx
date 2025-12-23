import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Wifi, 
  Battery, 
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DeviceTest {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  result?: string;
  details?: string;
}

export default function MobileExperienceTester() {
  const [tests, setTests] = useState<DeviceTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    collectDeviceInfo();
  }, []);

  const collectDeviceInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      touchSupport: 'ontouchstart' in window,
      orientation: screen.orientation?.type || 'unknown',
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      battery: 'getBattery' in navigator,
      serviceWorker: 'serviceWorker' in navigator,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      installPrompt: 'onbeforeinstallprompt' in window,
    };
    setDeviceInfo(info);
  };

  const testDefinitions = [
    {
      id: 'viewport-detection',
      name: 'Viewport Detection',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        const isMobileDetected = window.innerWidth < 768;
        return {
          status: isMobileDetected === isMobile ? 'passed' : 'warning',
          result: `Mobile detected: ${isMobile}, Viewport: ${window.innerWidth}px`,
          details: isMobileDetected === isMobile ? 'Correct detection' : 'Detection mismatch'
        };
      }
    },
    {
      id: 'touch-support',
      name: 'Touch Interface',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        const hasTouch = 'ontouchstart' in window;
        return {
          status: hasTouch ? 'passed' : 'warning',
          result: `Touch support: ${hasTouch ? 'Available' : 'Not available'}`,
          details: hasTouch ? 'Touch events supported' : 'Mouse-only interface'
        };
      }
    },
    {
      id: 'responsive-layout',
      name: 'Responsive Layout',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        const container = document.querySelector('.payment-container') || document.body;
        const computedStyle = window.getComputedStyle(container);
        const isResponsive = computedStyle.maxWidth !== 'none' || computedStyle.width.includes('%');
        return {
          status: isResponsive ? 'passed' : 'warning',
          result: `Layout: ${isResponsive ? 'Responsive' : 'Fixed width'}`,
          details: `Container width: ${computedStyle.width}, max-width: ${computedStyle.maxWidth}`
        };
      }
    },
    {
      id: 'font-scaling',
      name: 'Font Scaling',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        const testElement = document.createElement('div');
        testElement.style.fontSize = '1rem';
        document.body.appendChild(testElement);
        const fontSize = window.getComputedStyle(testElement).fontSize;
        document.body.removeChild(testElement);
        
        const baseFontSize = parseInt(fontSize);
        return {
          status: baseFontSize >= 16 ? 'passed' : 'warning',
          result: `Base font size: ${baseFontSize}px`,
          details: baseFontSize >= 16 ? 'Good readability' : 'Consider larger fonts'
        };
      }
    },
    {
      id: 'button-targets',
      name: 'Touch Target Size',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        const buttons = document.querySelectorAll('button');
        let minSize = Infinity;
        buttons.forEach(button => {
          const rect = button.getBoundingClientRect();
          const size = Math.min(rect.width, rect.height);
          if (size > 0) minSize = Math.min(minSize, size);
        });
        
        const isGoodSize = minSize >= 44; // 44px minimum recommended
        return {
          status: isGoodSize ? 'passed' : 'warning',
          result: `Min button size: ${minSize.toFixed(0)}px`,
          details: isGoodSize ? 'Touch targets are accessible' : 'Some buttons may be too small'
        };
      }
    },
    {
      id: 'pwa-manifest',
      name: 'PWA Manifest',
      test: async (): Promise<{ status: DeviceTest['status'], result: string, details: string }> => {
        try {
          const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
          if (!manifestLink) {
            return {
              status: 'failed',
              result: 'No manifest found',
              details: 'PWA manifest is missing'
            };
          }
          
          const response = await fetch(manifestLink.href);
          const manifest = await response.json();
          
          const hasRequiredFields = manifest.name && manifest.start_url && manifest.icons;
          return {
            status: hasRequiredFields ? 'passed' : 'warning',
            result: `Manifest: ${hasRequiredFields ? 'Valid' : 'Incomplete'}`,
            details: `Name: ${!!manifest.name}, Icons: ${!!manifest.icons}, Start URL: ${!!manifest.start_url}`
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Manifest error',
            details: error instanceof Error ? error.message : 'Failed to load manifest'
          };
        }
      }
    },
    {
      id: 'service-worker',
      name: 'Service Worker',
      test: async (): Promise<{ status: DeviceTest['status'], result: string, details: string }> => {
        if (!('serviceWorker' in navigator)) {
          return {
            status: 'failed',
            result: 'Not supported',
            details: 'Service Worker API not available'
          };
        }
        
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            status: registration ? 'passed' : 'warning',
            result: `Service Worker: ${registration ? 'Active' : 'Not registered'}`,
            details: registration ? `Scope: ${registration.scope}` : 'No active service worker'
          };
        } catch (error) {
          return {
            status: 'failed',
            result: 'Service Worker error',
            details: error instanceof Error ? error.message : 'Failed to check service worker'
          };
        }
      }
    },
    {
      id: 'install-prompt',
      name: 'Install Prompt',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        const hasInstallPrompt = 'onbeforeinstallprompt' in window;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        
        return {
          status: hasInstallPrompt || isStandalone ? 'passed' : 'warning',
          result: isStandalone ? 'Already installed' : hasInstallPrompt ? 'Installable' : 'Not installable',
          details: isStandalone ? 'Running in standalone mode' : hasInstallPrompt ? 'Install prompt available' : 'Install criteria not met'
        };
      }
    },
    {
      id: 'offline-support',
      name: 'Offline Support',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        const hasOfflineSupport = 'serviceWorker' in navigator && navigator.onLine !== undefined;
        return {
          status: hasOfflineSupport ? 'passed' : 'warning',
          result: `Offline: ${hasOfflineSupport ? 'Supported' : 'Not supported'}`,
          details: hasOfflineSupport ? 'Can detect network status' : 'Limited offline capabilities'
        };
      }
    },
    {
      id: 'performance',
      name: 'Performance Metrics',
      test: (): { status: DeviceTest['status'], result: string, details: string } => {
        if (!('performance' in window)) {
          return {
            status: 'failed',
            result: 'Performance API unavailable',
            details: 'Cannot measure performance'
          };
        }
        
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
        
        return {
          status: loadTime < 3000 ? 'passed' : loadTime < 5000 ? 'warning' : 'failed',
          result: `Load time: ${loadTime.toFixed(0)}ms`,
          details: loadTime < 3000 ? 'Fast load time' : loadTime < 5000 ? 'Acceptable load time' : 'Slow load time'
        };
      }
    }
  ];

  const runTests = async () => {
    setIsRunning(true);
    setTests(testDefinitions.map(def => ({
      id: def.id,
      name: def.name,
      status: 'pending'
    })));

    for (const testDef of testDefinitions) {
      setTests(prev => prev.map(test => 
        test.id === testDef.id ? { ...test, status: 'running' } : test
      ));

      try {
        const result = await testDef.test();
        setTests(prev => prev.map(test => 
          test.id === testDef.id ? { ...test, ...result } : test
        ));
      } catch (error) {
        setTests(prev => prev.map(test => 
          test.id === testDef.id ? { 
            ...test, 
            status: 'failed' as const,
            result: 'Test error',
            details: error instanceof Error ? error.message : 'Unknown error'
          } : test
        ));
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DeviceTest['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'running': return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-muted" />;
    }
  };

  const getDeviceTypeIcon = () => {
    if (deviceInfo.screenWidth <= 480) return <Smartphone className="w-5 h-5" />;
    if (deviceInfo.screenWidth <= 1024) return <Tablet className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Mobile Experience Testing</h2>
        <p className="text-muted-foreground">
          Comprehensive testing for mobile responsiveness and PWA functionality
        </p>
      </div>

      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getDeviceTypeIcon()}
            <span>Device Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Screen:</span>
                <span>{deviceInfo.screenWidth}×{deviceInfo.screenHeight}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Viewport:</span>
                <span>{deviceInfo.viewportWidth}×{deviceInfo.viewportHeight}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Pixel Ratio:</span>
                <span>{deviceInfo.pixelRatio}x</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Orientation:</span>
                <span>{deviceInfo.orientation}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Platform:</span>
                <span>{deviceInfo.platform}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Connection:</span>
                <span>{deviceInfo.connection}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Touch Support:</span>
                <span>{deviceInfo.touchSupport ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">PWA Mode:</span>
                <span>{deviceInfo.standalone ? 'Installed' : 'Browser'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Mobile Detected</p>
                <p className="text-xs text-muted-foreground">
                  {isMobile ? 'Yes' : 'No'} ({deviceInfo.viewportWidth}px)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wifi className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Connection</p>
                <p className="text-xs text-muted-foreground">
                  {deviceInfo.onLine ? 'Online' : 'Offline'} ({deviceInfo.connection})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-fuchsia-500" />
              <div>
                <p className="text-sm font-medium">PWA Status</p>
                <p className="text-xs text-muted-foreground">
                  {deviceInfo.standalone ? 'Installed' : deviceInfo.installPrompt ? 'Installable' : 'Not ready'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Tests Button */}
      <Button 
        onClick={runTests} 
        disabled={isRunning}
        className="w-full"
      >
        {isRunning ? 'Running Mobile Tests...' : 'Run Mobile Experience Tests'}
      </Button>

      {/* Test Results */}
      {tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600">
                ✓ {tests.filter(t => t.status === 'passed').length} Passed
              </span>
              <span className="text-yellow-600">
                ⚠ {tests.filter(t => t.status === 'warning').length} Warnings
              </span>
              <span className="text-red-600">
                ✗ {tests.filter(t => t.status === 'failed').length} Failed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tests.map(test => (
                <div key={test.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{test.name}</span>
                      {test.result && (
                        <Badge variant={
                          test.status === 'passed' ? 'default' :
                          test.status === 'warning' ? 'secondary' : 'destructive'
                        }>
                          {test.result}
                        </Badge>
                      )}
                    </div>
                    {test.details && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {test.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {tests.some(t => t.status === 'warning' || t.status === 'failed') && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some mobile experience tests showed warnings or failures. 
            Review the results above to improve the mobile user experience.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
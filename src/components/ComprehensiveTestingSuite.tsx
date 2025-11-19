import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Smartphone, 
  Shield, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  TestTube,
  Activity,
  Settings,
  FileText
} from 'lucide-react';
import PaymentFlowTester from './PaymentFlowTester';
import MobileExperienceTester from './MobileExperienceTester';
import { LaunchReadinessChecker } from './LaunchReadinessChecker';
import ComprehensiveTestReport from './ComprehensiveTestReport';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'not-run' | 'running' | 'passed' | 'failed' | 'warning';
  lastRun?: Date;
  issues?: number;
}

export default function ComprehensiveTestingSuite() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    {
      id: 'payment-flows',
      name: 'Payment Flows',
      description: 'Test all payment scenarios including edge cases',
      icon: CreditCard,
      status: 'not-run'
    },
    {
      id: 'mobile-experience',
      name: 'Mobile Experience',
      description: 'PWA functionality and responsive design testing',
      icon: Smartphone,
      status: 'not-run'
    },
    {
      id: 'security-checks',
      name: 'Security & Launch Readiness',
      description: 'Security configurations and production readiness',
      icon: Shield,
      status: 'not-run'
    },
    {
      id: 'performance',
      name: 'Performance Testing',
      description: 'Load times, responsiveness, and optimization',
      icon: Zap,
      status: 'not-run'
    }
  ]);

  const [activeTab, setActiveTab] = useState('overview');
  const [runningFullSuite, setRunningFullSuite] = useState(false);

  const updateTestSuiteStatus = (suiteId: string, status: TestSuite['status'], issues?: number) => {
    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? { ...suite, status, lastRun: new Date(), issues }
        : suite
    ));
  };

  const runFullTestSuite = async () => {
    setRunningFullSuite(true);
    
    // Simulate running all test suites
    for (const suite of testSuites) {
      updateTestSuiteStatus(suite.id, 'running');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random results for demo
      const outcomes: TestSuite['status'][] = ['passed', 'warning', 'failed'];
      const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      const issues = randomOutcome === 'failed' ? Math.floor(Math.random() * 5) + 1 : 
                   randomOutcome === 'warning' ? Math.floor(Math.random() * 3) : 0;
      
      updateTestSuiteStatus(suite.id, randomOutcome, issues);
    }
    
    setRunningFullSuite(false);
  };

  const getStatusColor = (status: TestSuite['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: TestSuite['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'running': return <Activity className="w-5 h-5 text-blue-600 animate-pulse" />;
      default: return <TestTube className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Day 2: Testing & Quality Assurance</h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive testing suite for payment flows, mobile experience, and production readiness
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payment-flows">Payment Tests</TabsTrigger>
            <TabsTrigger value="mobile-experience">Mobile Tests</TabsTrigger>
            <TabsTrigger value="security-checks">Security & Launch</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Test Suite Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Test Suite Overview</CardTitle>
                <CardDescription>
                  Monitor the status of all testing categories and run comprehensive tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {testSuites.map(suite => (
                    <Card key={suite.id} className={`border-2 ${getStatusColor(suite.status)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <suite.icon className="w-6 h-6 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold">{suite.name}</h3>
                              {getStatusIcon(suite.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {suite.description}
                            </p>
                            {suite.lastRun && (
                              <p className="text-xs text-muted-foreground">
                                Last run: {suite.lastRun.toLocaleString()}
                              </p>
                            )}
                            {suite.issues !== undefined && suite.issues > 0 && (
                              <Badge variant="destructive" className="mt-2">
                                {suite.issues} issue{suite.issues > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={runFullTestSuite}
                    disabled={runningFullSuite}
                    className="flex-1"
                  >
                    {runningFullSuite ? 'Running Full Test Suite...' : 'Run All Tests'}
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={runningFullSuite}
                    onClick={() => setActiveTab('report')}
                  >
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testSuites.filter(s => s.status === 'passed').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Passed Suites</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {testSuites.filter(s => s.status === 'warning').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testSuites.filter(s => s.status === 'failed').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Failed Suites</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {testSuites.reduce((sum, s) => sum + (s.issues || 0), 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                </CardContent>
              </Card>
            </div>

            {/* Critical Alerts */}
            {testSuites.some(s => s.status === 'failed') && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Critical issues detected in one or more test suites. 
                  Review failed tests before deploying to production.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="payment-flows" className="mt-6">
            <PaymentFlowTester />
          </TabsContent>

          <TabsContent value="mobile-experience" className="mt-6">
            <MobileExperienceTester />
          </TabsContent>

          <TabsContent value="security-checks" className="mt-6">
            <LaunchReadinessChecker />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Testing (Day 3)</CardTitle>
                <CardDescription>
                  Test application performance, load times, and optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Day 3 Performance Testing Suite</strong> - Available after Supabase Auth configuration:
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>Page load time analysis (Core Web Vitals)</li>
                      <li>Payment flow performance metrics</li>
                      <li>Database query optimization checks</li>
                      <li>Bundle size analysis & tree shaking</li>
                      <li>API response times under load</li>
                      <li>Caching effectiveness analysis</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="mt-6">
            <ComprehensiveTestReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
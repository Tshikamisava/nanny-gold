import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  Play
} from 'lucide-react';
import {
  TestScenario,
  allScenarios,
  shortTermScenarios,
  longTermScenarios,
  commissionScenarios,
  referralScenarios,
  flowScenarios,
  analyticsScenarios,
} from './Phase7TestCategories';
import { runTest } from './Phase7TestRunner';
import { TestDataManager } from './TestDataManager';
import { supabase } from '@/integrations/supabase/client';

const Phase7BookingFlowTester = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('short-term');
  const [testResults, setTestResults] = useState<TestScenario[]>(
    allScenarios.map(s => ({ ...s, status: 'pending' as const, message: '' }))
  );
  const [testDataReady, setTestDataReady] = useState(false);
  const [testBookingCount, setTestBookingCount] = useState(0);

  const checkTestDataStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('services->>test_data', 'true');

      if (error) throw error;

      const count = data?.length || 0;
      setTestBookingCount(count);
      setTestDataReady(count === 43);
    } catch (error) {
      console.error('Error checking test data:', error);
      setTestDataReady(false);
    }
  };

  const runAllTests = async () => {
    // Check if test data is ready
    await checkTestDataStatus();
    
    if (!testDataReady) {
      toast({
        title: "Test Data Missing",
        description: `Only ${testBookingCount}/43 test bookings found. Please generate test data first.`,
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    const results: TestScenario[] = [];
    
    for (const scenario of allScenarios) {
      const testScenario: TestScenario = { ...scenario, status: 'pending', message: '' };
      setTestResults(prev => prev.map(t => t.id === scenario.id ? { ...testScenario, status: 'running' } : t));
      
      const result = await runTest(testScenario);
      results.push(result);
      setTestResults(prev => prev.map(t => t.id === result.id ? result : t));
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsRunning(false);
    
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    
    toast({
      title: "Test Suite Complete",
      description: `${passCount} passed, ${failCount} failed out of ${results.length} tests`,
      variant: passCount === results.length ? "default" : "destructive"
    });
  };

  const runCategoryTests = async (category: string) => {
    setIsRunning(true);
    const categoryScenarios = testResults.filter(t => t.category === category);
    
    for (const scenario of categoryScenarios) {
      setTestResults(prev => prev.map(t => t.id === scenario.id ? { ...t, status: 'running' } : t));
      const result = await runTest(scenario);
      setTestResults(prev => prev.map(t => t.id === result.id ? result : t));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsRunning(false);
    toast({ title: "Category tests complete", description: `${category} tests finished` });
  };

  const runSingleTest = async (testId: string) => {
    const test = testResults.find(t => t.id === testId);
    if (!test) return;
    
    setTestResults(prev => prev.map(t => t.id === testId ? { ...t, status: 'running' } : t));
    const result = await runTest(test);
    setTestResults(prev => prev.map(t => t.id === result.id ? result : t));
    
    toast({
      title: result.status === 'pass' ? "Test Passed" : "Test Failed",
      description: result.message,
      variant: result.status === 'pass' ? "default" : "destructive"
    });
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.length,
        passed: testResults.filter(t => t.status === 'pass').length,
        failed: testResults.filter(t => t.status === 'fail').length,
        pending: testResults.filter(t => t.status === 'pending').length,
      },
      tests: testResults
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phase7-test-report-${Date.now()}.json`;
    a.click();
  };

  const getStatusIcon = (status: TestScenario['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryTests = (category: string) => {
    return testResults.filter(t => t.category === category);
  };

  const getCategoryStats = (category: string) => {
    const tests = getCategoryTests(category);
    return {
      total: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail').length,
    };
  };

  const overallStats = {
    total: testResults.length,
    passed: testResults.filter(t => t.status === 'pass').length,
    failed: testResults.filter(t => t.status === 'fail').length,
    pending: testResults.filter(t => t.status === 'pending').length,
  };

  const progressPercentage = ((overallStats.passed + overallStats.failed) / overallStats.total) * 100;

  // Check test data on mount
  useState(() => {
    checkTestDataStatus();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Phase 7: Complete Booking Flow Testing</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Comprehensive end-to-end tests for all booking scenarios, pricing calculations, and data consistency
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Data Status Banner */}
          <Alert variant={testDataReady ? "default" : "destructive"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Test Data: {testDataReady ? `Ready (${testBookingCount}/43 bookings)` : `Missing (${testBookingCount}/43 bookings)`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkTestDataStatus}
                  disabled={isRunning}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{overallStats.total}</div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{overallStats.passed}</div>
                <p className="text-sm text-muted-foreground">Passed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{overallStats.failed}</div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-600">{overallStats.pending}</div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} />
          </div>
        </CardContent>
      </Card>

      {/* Test Categories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="short-term">Short-Term</TabsTrigger>
          <TabsTrigger value="long-term">Long-Term</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="referral">Referral</TabsTrigger>
          <TabsTrigger value="flow">Flow</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="data-management">Test Data</TabsTrigger>
        </TabsList>

        {['short-term', 'long-term', 'commission', 'referral', 'flow', 'analytics'].map(category => {
          const stats = getCategoryStats(category);
          const tests = getCategoryTests(category);
          
          return (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold capitalize">{category.replace('-', ' ')} Tests</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.passed} / {stats.total} passed
                  </p>
                </div>
                <Button 
                  onClick={() => runCategoryTests(category)}
                  disabled={isRunning}
                  size="sm"
                  variant="outline"
                >
                  Run Category
                </Button>
              </div>

              <div className="space-y-2">
                {tests.map(test => (
                  <Card key={test.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(test.status)}
                          <div className="flex-1">
                            <div className="font-medium">{test.name}</div>
                            {test.message && (
                              <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                            )}
                            {test.expectedValue !== undefined && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Expected: R{test.expectedValue.toFixed(2)} | 
                                Actual: R{(test.actualValue || 0).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => runSingleTest(test.id)}
                          disabled={isRunning}
                        >
                          Run
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          );
        })}

        <TabsContent value="data-management">
          <TestDataManager />
        </TabsContent>
      </Tabs>

      {/* Production Readiness Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Production Readiness Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Before Day 3 Launch:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>All test scenarios pass (100% pass rate)</li>
                  <li>No critical security warnings</li>
                  <li>Load testing completed (100 concurrent users)</li>
                  <li>Email delivery confirmed</li>
                  <li>Payment gateway in live mode</li>
                  <li>Database backups automated</li>
                  <li>Monitoring/alerting set up</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default Phase7BookingFlowTester;

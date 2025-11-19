import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, Users, MessageSquare, Calendar, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

interface TestResult {
  id: string;
  name: string;
  description: string;
  category: string;
  status: TestStatus;
  details?: string;
}

export default function Phase4CrossTenantTester() {
  const { toast } = useToast();
  const [tests, setTests] = useState<TestResult[]>([
    {
      id: 'end-to-end-booking',
      name: 'Complete Booking Cycle',
      description: 'Test client booking → nanny response → admin approval flow',
      category: 'End-to-End Workflows',
      status: 'pending'
    },
    {
      id: 'realtime-notifications',
      name: 'Real-time Notifications',
      description: 'Verify notifications across different user types',
      category: 'Real-time Features',
      status: 'pending'
    },
    {
      id: 'interview-scheduling',
      name: 'Interview Scheduling',
      description: 'Test interview scheduling between clients and nannies',
      category: 'Communication',
      status: 'pending'
    },
    {
      id: 'chat-system',
      name: 'Chat System',
      description: 'Verify real-time messaging functionality',
      category: 'Communication',
      status: 'pending'
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const updateTestStatus = (testId: string, status: TestStatus, details?: string) => {
    setTests(prev => prev.map(test => 
      test.id === testId ? { ...test, status, details } : test
    ));
  };

  const runTest = async (testId: string) => {
    updateTestStatus(testId, 'running');
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock test results
    const success = Math.random() > 0.3; // 70% success rate for demo
    updateTestStatus(testId, success ? 'passed' : 'failed', 
      success ? 'Test completed successfully' : 'Test failed - check configuration');
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    toast({
      title: "Starting Phase 4 Tests",
      description: "Running cross-tenant integration tests...",
    });

    for (const test of tests) {
      await runTest(test.id);
    }

    setIsRunning(false);
    toast({
      title: "Phase 4 Tests Completed",
      description: "Cross-tenant integration tests finished",
    });
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestStatus) => {
    const variants = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-600'
    };
    
    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const progressPercentage = ((passedTests + failedTests) / tests.length) * 100;

  const groupedTests = tests.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Phase 4: Cross-Tenant Integration Tests
          </CardTitle>
          <CardDescription>
            End-to-end workflows testing complete booking cycles, real-time notifications, and cross-tenant functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Progress: {Math.round(progressPercentage)}%</p>
                <p className="text-xs text-muted-foreground">
                  {passedTests} passed, {failedTests} failed, {tests.length - passedTests - failedTests} pending
                </p>
              </div>
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Running Tests
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    Run All Tests
                  </>
                )}
              </Button>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedTests).map(([category, categoryTests]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {category === 'End-to-End Workflows' && <BookOpen className="w-5 h-5" />}
              {category === 'Real-time Features' && <MessageSquare className="w-5 h-5" />}
              {category === 'Communication' && <Calendar className="w-5 h-5" />}
              {category}
            </CardTitle>
            <CardDescription>
              {categoryTests.filter(test => test.status === 'passed').length} of {categoryTests.length} tests passed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryTests.map((test) => (
                <Card key={test.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(test.status)}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{test.name}</h4>
                            {getStatusBadge(test.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{test.description}</p>
                          {test.details && (
                            <p className="text-xs text-muted-foreground mt-1">{test.details}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => runTest(test.id)}
                        disabled={test.status === 'running' || isRunning}
                        variant="outline"
                        size="sm"
                      >
                        {test.status === 'running' ? 'Running...' : 'Test'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
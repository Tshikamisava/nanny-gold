import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Clipboard, Users, CreditCard, Zap, Smartphone, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  checked: boolean;
  critical: boolean;
  icon: React.ReactNode;
}

export const FinalPreDay3Checklist = () => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    // User Roles & Authentication
    {
      id: 'admin-roles',
      category: 'User Roles',
      title: 'Admin roles functioning correctly',
      description: 'Admin users can access admin panel and manage all system functions',
      checked: false,
      critical: true,
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'nanny-roles',
      category: 'User Roles', 
      title: 'Nanny roles functioning correctly',
      description: 'Nannies can manage profiles, bookings, and receive notifications',
      checked: false,
      critical: true,
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'client-roles',
      category: 'User Roles',
      title: 'Client roles functioning correctly', 
      description: 'Clients can book nannies, manage payments, and communicate',
      checked: false,
      critical: true,
      icon: <Users className="w-4 h-4" />
    },
    
    // Payment Flows
    {
      id: 'payment-integration',
      category: 'Payment Flows',
      title: 'Payment integration working',
      description: 'Paystack integration functioning for booking payments',
      checked: false,
      critical: true,
      icon: <CreditCard className="w-4 h-4" />
    },
    {
      id: 'payment-methods',
      category: 'Payment Flows',
      title: 'Payment methods management',
      description: 'Clients can add, remove, and set default payment methods',
      checked: false,
      critical: true,
      icon: <CreditCard className="w-4 h-4" />
    },
    {
      id: 'recurring-payments',
      category: 'Payment Flows',
      title: 'Recurring payments setup',
      description: 'Monthly recurring payments configured and tested',
      checked: false,
      critical: true,
      icon: <CreditCard className="w-4 h-4" />
    },
    
    // Real-time Features
    {
      id: 'realtime-notifications',
      category: 'Real-time Features',
      title: 'Real-time notifications operational',
      description: 'Push notifications working across all user types',
      checked: false,
      critical: true,
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: 'chat-system',
      category: 'Real-time Features',
      title: 'Chat system functioning',
      description: 'Real-time messaging between clients, nannies, and admins',
      checked: false,
      critical: true,
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: 'booking-updates',
      category: 'Real-time Features',
      title: 'Booking status updates',
      description: 'Real-time booking status changes and notifications',
      checked: false,
      critical: true,
      icon: <Zap className="w-4 h-4" />
    },
    
    // Mobile Responsiveness
    {
      id: 'mobile-layout',
      category: 'Mobile Responsiveness',
      title: 'Mobile layouts confirmed',
      description: 'All pages responsive and functional on mobile devices',
      checked: false,
      critical: true,
      icon: <Smartphone className="w-4 h-4" />
    },
    {
      id: 'mobile-navigation',
      category: 'Mobile Responsiveness',
      title: 'Mobile navigation working',
      description: 'Sidebar, menu, and navigation elements work on mobile',
      checked: false,
      critical: false,
      icon: <Smartphone className="w-4 h-4" />
    },
    {
      id: 'mobile-forms',
      category: 'Mobile Responsiveness',
      title: 'Mobile form functionality',
      description: 'All forms and inputs work properly on mobile devices',
      checked: false,
      critical: true,
      icon: <Smartphone className="w-4 h-4" />
    },
    
    // Security Measures
    {
      id: 'rls-policies',
      category: 'Security Measures',
      title: 'Row Level Security policies',
      description: 'RLS policies properly configured for all tables',
      checked: false,
      critical: true,
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'data-validation',
      category: 'Security Measures',
      title: 'Data validation in place',
      description: 'Input validation and sanitization implemented',
      checked: false,
      critical: true,
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'auth-security',
      category: 'Security Measures',
      title: 'Authentication security',
      description: 'Password policies, rate limiting, and secure sessions',
      checked: false,
      critical: true,
      icon: <Shield className="w-4 h-4" />
    },
    
    // Additional Checks
    {
      id: 'error-handling',
      category: 'System Stability',
      title: 'Error handling implemented',
      description: 'Proper error messages and fallback handling',
      checked: false,
      critical: false,
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      id: 'performance-optimized',
      category: 'System Stability',
      title: 'Performance optimized',
      description: 'Page load times and database queries optimized',
      checked: false,
      critical: false,
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: 'backup-tested',
      category: 'System Stability',
      title: 'Backup and recovery tested',
      description: 'Database backups configured and recovery tested',
      checked: false,
      critical: false,
      icon: <Shield className="w-4 h-4" />
    }
  ]);

  const { toast } = useToast();

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const markAllAsComplete = () => {
    setChecklist(prev => prev.map(item => ({ ...item, checked: true })));
    toast({
      title: "All Items Checked",
      description: "All checklist items marked as complete",
    });
  };

  const resetChecklist = () => {
    setChecklist(prev => prev.map(item => ({ ...item, checked: false })));
    toast({
      title: "Checklist Reset",
      description: "All items reset to unchecked state",
    });
  };

  const checkedItems = checklist.filter(item => item.checked).length;
  const criticalItems = checklist.filter(item => item.critical);
  const checkedCriticalItems = criticalItems.filter(item => item.checked).length;
  const progressPercentage = (checkedItems / checklist.length) * 100;
  const criticalProgressPercentage = (checkedCriticalItems / criticalItems.length) * 100;

  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const getReadinessStatus = () => {
    if (criticalProgressPercentage === 100) {
      return { status: 'ready', message: 'System ready for Day 3 launch!', color: 'text-green-600' };
    } else if (criticalProgressPercentage >= 80) {
      return { status: 'almost', message: 'Almost ready - few critical items remaining', color: 'text-yellow-600' };
    } else {
      return { status: 'not-ready', message: 'Not ready - critical items need attention', color: 'text-red-600' };
    }
  };

  const readiness = getReadinessStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clipboard className="w-5 h-5" />
            Final Pre-Day 3 Launch Checklist
          </CardTitle>
          <CardDescription>
            Comprehensive checklist to ensure system readiness for Day 3 launch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Overall Progress: {Math.round(progressPercentage)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {checkedItems} of {checklist.length} items completed
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetChecklist}>
                    Reset All
                  </Button>
                  <Button size="sm" onClick={markAllAsComplete}>
                    Mark All Complete
                  </Button>
                </div>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>

            {/* Critical Items Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Critical Items: {Math.round(criticalProgressPercentage)}%</p>
                <Badge variant={criticalProgressPercentage === 100 ? "default" : "destructive"}>
                  {checkedCriticalItems} of {criticalItems.length} critical
                </Badge>
              </div>
              <Progress value={criticalProgressPercentage} className="w-full" />
            </div>

            {/* Readiness Status */}
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <span className={`font-medium ${readiness.color}`}>
                  Launch Status: {readiness.message}
                </span>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items by Category */}
      <div className="space-y-6">
        {Object.entries(groupedChecklist).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>
                {items.filter(item => item.checked).length} of {items.length} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex items-start gap-3 flex-1">
                      {item.icon}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <label 
                            htmlFor={item.id}
                            className={`font-medium cursor-pointer ${
                              item.checked ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {item.title}
                          </label>
                          {item.critical && (
                            <Badge variant="destructive">
                              Critical
                            </Badge>
                          )}
                          {item.checked && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className={`text-sm ${
                          item.checked ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
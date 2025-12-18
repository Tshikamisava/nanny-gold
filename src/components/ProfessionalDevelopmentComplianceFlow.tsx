import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  Calendar,
  DollarSign,
  User,
  Bell,
  RefreshCw,
  ArrowDown,
  XCircle
} from 'lucide-react';

interface ComplianceFlowStepProps {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'active' | 'pending' | 'critical';
  details?: string[];
  timeframe?: string;
}

const ComplianceFlowStep: React.FC<ComplianceFlowStepProps> = ({
  step,
  title,
  description,
  icon,
  status,
  details,
  timeframe
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'border-green-500 bg-green-50';
      case 'active': return 'border-orange-500 bg-orange-50';
      case 'pending': return 'border-blue-500 bg-blue-50';
      case 'critical': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed': return <Badge variant="default" className="bg-green-600">Complete</Badge>;
      case 'active': return <Badge variant="destructive">In Progress</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      default: return null;
    }
  };

  return (
    <Card className={`border-2 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-current">
              <span className="text-sm font-bold">{step}</span>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {icon}
                {title}
              </CardTitle>
              {timeframe && (
                <p className="text-sm text-muted-foreground">{timeframe}</p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 mb-3">{description}</p>
        {details && (
          <ul className="text-xs space-y-1">
            {details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export const ProfessionalDevelopmentComplianceFlow: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<'overdue' | 'compliant'>('overdue');

  const overdueSteps = [
    {
      step: 1,
      title: "Training Material Assigned",
      description: "Admin creates and assigns mandatory training material to all nannies",
      icon: <Calendar className="w-5 h-5" />,
      status: 'completed' as const,
      timeframe: "Assignment Date",
      details: [
        "Material marked as 'mandatory: true'",
        "Due date set (typically 7 days)",
        "All active nannies automatically assigned",
        "Database: professional_development_assignments created"
      ]
    },
    {
      step: 2,
      title: "Grace Period (7 Days)",
      description: "Nanny has 7 days to complete the training material",
      icon: <Clock className="w-5 h-5" />,
      status: 'completed' as const,
      timeframe: "Days 1-7",
      details: [
        "Nanny status remains: 'compliant'",
        "can_receive_bookings: true",
        "Normal booking flow continues",
        "No restrictions applied"
      ]
    },
    {
      step: 3,
      title: "Assignment Becomes Overdue",
      description: "7 days pass without completion - automated system triggers",
      icon: <AlertTriangle className="w-5 h-5" />,
      status: 'critical' as const,
      timeframe: "Day 8 (Automatic)",
      details: [
        "Database trigger: update_assignment_status() runs",
        "Assignment status changes to 'overdue'",
        "System flags nanny for compliance review",
        "Automated compliance check triggered"
      ]
    },
    {
      step: 4,
      title: "Compliance Status Update",
      description: "System automatically updates nanny compliance status",
      icon: <RefreshCw className="w-5 h-5" />,
      status: 'critical' as const,
      timeframe: "Immediate (Automated)",
      details: [
        "Function: update_nanny_pd_compliance() executes",
        "pd_compliance_status changes from 'compliant' to 'suspended'",
        "can_receive_bookings changes from true to false",
        "Nanny immediately ineligible for new bookings"
      ]
    },
    {
      step: 5,
      title: "Booking Restrictions Applied",
      description: "New booking requests are automatically blocked",
      icon: <Ban className="w-5 h-5" />,
      status: 'critical' as const,
      timeframe: "Immediate",
      details: [
        "Nanny profile hidden from client searches",
        "Existing pending bookings may be cancelled",
        "Booking system checks can_receive_bookings = false",
        "Error message shown to clients attempting to book"
      ]
    },
    {
      step: 6,
      title: "Payment Suspension",
      description: "Payouts for new work are suspended pending compliance",
      icon: <DollarSign className="w-5 h-5" />,
      status: 'critical' as const,
      timeframe: "For New Bookings Only",
      details: [
        "Existing booking payments continue normally",
        "New work payments held until compliance restored",
        "Nanny notified of suspension reason",
        "Clear instructions provided for resolution"
      ]
    },
    {
      step: 7,
      title: "Automated Notifications",
      description: "System sends notifications to nanny and admins",
      icon: <Bell className="w-5 h-5" />,
      status: 'active' as const,
      timeframe: "Immediate",
      details: [
        "Nanny receives suspension notification",
        "Admin dashboard shows overdue count",
        "Escalation to admin team",
        "Clear resolution steps provided"
      ]
    },
    {
      step: 8,
      title: "Resolution Required",
      description: "Nanny must complete overdue training to restore access",
      icon: <CheckCircle className="w-5 h-5" />,
      status: 'pending' as const,
      timeframe: "Until Completion",
      details: [
        "Nanny completes overdue training material",
        "Completion recorded in database",
        "Compliance status automatically updates to 'compliant'",
        "can_receive_bookings restored to true",
        "Booking privileges immediately restored"
      ]
    }
  ];

  const compliantSteps = [
    {
      step: 1,
      title: "Training Assigned",
      description: "Mandatory training assigned with 7-day deadline",
      icon: <Calendar className="w-5 h-5" />,
      status: 'completed' as const,
      timeframe: "Assignment Date"
    },
    {
      step: 2,
      title: "Nanny Completes Training",
      description: "Training completed within the 7-day window",
      icon: <CheckCircle className="w-5 h-5" />,
      status: 'completed' as const,
      timeframe: "Within 7 Days"
    },
    {
      step: 3,
      title: "Compliance Maintained",
      description: "Status remains 'compliant' - no restrictions applied",
      icon: <User className="w-5 h-5" />,
      status: 'completed' as const,
      timeframe: "Ongoing"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-fuchsia-900 mb-4">
          Professional Development Compliance Flow
        </h2>
        <p className="text-fuchsia-700 mb-6">
          Step-by-step breakdown of what happens when nannies become overdue on training
        </p>
        
        {/* Scenario Selector */}
        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={() => setSelectedScenario('overdue')}
            variant={selectedScenario === 'overdue' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Overdue Scenario
          </Button>
          <Button
            onClick={() => setSelectedScenario('compliant')}
            variant={selectedScenario === 'compliant' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Compliant Scenario
          </Button>
        </div>
      </div>

      {/* Key Impact Alert */}
      {selectedScenario === 'overdue' && (
        <Alert className="border-2 border-red-200 bg-red-50">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <strong>Critical Impact:</strong> When a nanny becomes overdue on mandatory training,
            they are immediately suspended from receiving new bookings and their payment eligibility
            for new work is revoked until compliance is restored.
          </AlertDescription>
        </Alert>
      )}

      {/* Steps Flow */}
      <div className="space-y-4">
        {(selectedScenario === 'overdue' ? overdueSteps : compliantSteps).map((step, index) => (
          <div key={step.step} className="relative">
            <ComplianceFlowStep {...step} />
            {index < (selectedScenario === 'overdue' ? overdueSteps : compliantSteps).length - 1 && (
              <div className="flex justify-center my-2">
                <ArrowDown className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Box */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Automated System Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Database Functions:</h4>
              <ul className="space-y-1">
                <li>• check_nanny_training_compliance()</li>
                <li>• update_nanny_compliance_status()</li>
                <li>• update_assignment_status()</li>
                <li>• trigger_update_nanny_compliance()</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Key Database Fields:</h4>
              <ul className="space-y-1">
                <li>• pd_compliance_status: 'compliant' | 'suspended'</li>
                <li>• can_receive_bookings: true | false</li>
                <li>• assignment status: 'assigned' → 'overdue'</li>
                <li>• due_date vs current timestamp</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
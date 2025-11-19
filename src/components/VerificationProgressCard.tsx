import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  XCircle, 
  FileText, 
  User, 
  Phone, 
  CreditCard,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const VERIFICATION_STEPS = [
  { key: 'document_verification', label: 'Document Verification', icon: FileText, description: 'ID, CV, and certificates verified' },
  { key: 'background_check', label: 'Background Check', icon: Shield, description: 'Criminal background verification' },
  { key: 'reference_check', label: 'Reference Check', icon: Phone, description: 'Previous employer verification' },
  { key: 'interview_completed', label: 'Interview', icon: User, description: 'Video interview with admin' }
];

interface VerificationStep {
  step_name: string;
  status: string;
  completed_at: string | null;
  notes: string | null;
}

interface NannyProfile {
  verification_status: string;
  interview_status: string;
  can_receive_bookings: boolean;
  verification_completed_at: string | null;
}

export default function VerificationProgressCard() {
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([]);
  const [nannyProfile, setNannyProfile] = useState<NannyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerificationData();
  }, []);

  const loadVerificationData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Load nanny profile
      const { data: profile, error: profileError } = await supabase
        .from('nannies')
        .select('verification_status, interview_status, can_receive_bookings, verification_completed_at')
        .eq('id', user.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Load verification steps
      const { data: steps, error: stepsError } = await supabase
        .from('nanny_verification_steps')
        .select('*')
        .eq('nanny_id', user.user.id);

      if (stepsError) throw stepsError;

      setNannyProfile(profile);
      setVerificationSteps((steps || []) as VerificationStep[]);
    } catch (error) {
      console.error('Error loading verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepKey: string): 'pending' | 'completed' | 'rejected' => {
    const step = verificationSteps.find(s => s.step_name === stepKey);
    const status = step?.status;
    if (status === 'completed' || status === 'rejected') {
      return status as 'completed' | 'rejected';
    }
    return 'pending';
  };

  const getStepNotes = (stepKey: string): string | null => {
    const step = verificationSteps.find(s => s.step_name === stepKey);
    return step?.notes || null;
  };

  const completedSteps = VERIFICATION_STEPS.filter(step => getStepStatus(step.key) === 'completed').length;
  const totalSteps = VERIFICATION_STEPS.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Needs Action</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getVerificationMessage = () => {
    if (!nannyProfile) return "Complete your profile to start verification.";
    
    if (nannyProfile.can_receive_bookings && nannyProfile.verification_status === 'verified') {
      return "🎉 Congratulations! You're fully verified and can now receive booking requests.";
    }
    
    if (nannyProfile.verification_status === 'interview_required') {
      return "📞 Your documents have been verified! You'll be contacted soon to schedule your interview.";
    }
    
    if (nannyProfile.verification_status === 'document_pending') {
      return "📋 Please ensure you've uploaded all required documents for verification.";
    }
    
    return "⏳ Your verification is in progress. We'll notify you of any updates.";
  };

  const getNextSteps = () => {
    const pendingSteps = VERIFICATION_STEPS.filter(step => getStepStatus(step.key) === 'pending');
    const rejectedSteps = VERIFICATION_STEPS.filter(step => getStepStatus(step.key) === 'rejected');
    
    if (rejectedSteps.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-600">Action Required:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
            {rejectedSteps.map(step => (
              <li key={step.key}>
                {step.label}: {getStepNotes(step.key) || 'Please check requirements'}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    
    if (pendingSteps.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Next Steps:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {pendingSteps.slice(0, 2).map(step => (
              <li key={step.key}>{step.description}</li>
            ))}
          </ul>
        </div>
      );
    }
    
    return (
      <div className="text-center py-4">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-green-600 mb-2">All Set!</h3>
        <p className="text-green-600 font-medium">
          You're now ready to receive booking requests!
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Clock className="w-8 h-8 animate-spin mx-auto" />
            <p className="mt-2">Loading verification status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Verification Progress
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {getVerificationMessage()}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {completedSteps} of {totalSteps} steps completed
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Verification Steps */}
        <div className="space-y-4">
          <h4 className="font-medium">Verification Steps</h4>
          <div className="space-y-3">
            {VERIFICATION_STEPS.map((step) => {
              const status = getStepStatus(step.key);
              const notes = getStepNotes(step.key);
              const IconComponent = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{step.label}</span>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    {notes && (
                      <p className="text-sm text-orange-600 mt-1 font-medium">{notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Steps */}
        <div className="border-t pt-4">
          {getNextSteps()}
          
          {nannyProfile?.verification_status === 'interview_required' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-600 font-medium">
                  Interview Required
                </p>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                You'll receive a call from our team within 24-48 hours to schedule your verification interview.
              </p>
            </div>
          )}
          
          {verificationSteps.some(s => s.status === 'rejected') && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600 font-medium">
                  Action Required
                </p>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Some steps need your attention. Please review the details above and take the necessary actions.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
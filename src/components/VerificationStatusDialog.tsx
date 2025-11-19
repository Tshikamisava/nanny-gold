import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VerificationStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VerificationStep {
  id: string;
  step_name: string;
  status: 'pending' | 'completed' | 'rejected';
  notes?: string;
  completed_at?: string;
}

interface DocumentStatus {
  id: string;
  document_type: string;
  file_name: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
}

const VERIFICATION_STEPS = [
  { key: 'identity_verification', label: 'Identity Verification', icon: User },
  { key: 'background_check', label: 'Background Check', icon: Shield },
  { key: 'reference_check', label: 'Reference Verification', icon: Phone },
  { key: 'document_verification', label: 'Document Verification', icon: FileText },
  { key: 'address_verification', label: 'Address Verification', icon: MapPin },
  { key: 'payment_setup', label: 'Payment Setup', icon: CreditCard }
];

export default function VerificationStatusDialog({ open, onOpenChange }: VerificationStatusDialogProps) {
  const [loading, setLoading] = useState(true);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([]);
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadVerificationData();
    }
  }, [open]);

  const loadVerificationData = async () => {
    setLoading(true);
    try {
      // Try to get the current session first, then user
      const { data: sessionData } = await supabase.auth.getSession();
      let currentUserId: string | null = null;
      
      if (sessionData?.session?.user?.id) {
        currentUserId = sessionData.session.user.id;
      } else {
        // If no session, try getUser as fallback
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          currentUserId = userData.user.id;
        }
      }
      
      if (!currentUserId) {
        console.warn('No authenticated user found, skipping verification data load');
        setVerificationSteps([]);
        setDocuments([]);
        return;
      }

      // Load verification steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('nanny_verification_steps')
        .select('*')
        .eq('nanny_id', currentUserId);

      if (stepsError) throw stepsError;

      // Load document statuses
      const { data: docsData, error: docsError } = await supabase
        .from('nanny_documents')
        .select('id, document_type, file_name, verification_status, rejection_reason')
        .eq('nanny_id', currentUserId);

      if (docsError) throw docsError;

      setVerificationSteps((stepsData || []) as VerificationStep[]);
      setDocuments((docsData || []) as DocumentStatus[]);
    } catch (error) {
      console.error('Error loading verification data:', error);
      // Only show toast for actual errors, not auth issues
      if (error instanceof Error && error.message !== 'User not authenticated') {
        toast({
          title: "Error loading verification status",
          description: "Could not load your verification data. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepKey: string): 'pending' | 'completed' | 'rejected' => {
    const step = verificationSteps.find(s => s.step_name === stepKey);
    return step?.status || 'pending';
  };

  const getStepNotes = (stepKey: string): string | undefined => {
    const step = verificationSteps.find(s => s.step_name === stepKey);
    return step?.notes;
  };

  const completedSteps = VERIFICATION_STEPS.filter(step => getStepStatus(step.key) === 'completed').length;
  const totalSteps = VERIFICATION_STEPS.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading verification status...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Verification Status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
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
                {completedSteps === totalSteps ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Verification Complete!</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete all verification steps to become a verified nanny
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Steps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Verification Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                        {notes && (
                          <p className="text-sm text-muted-foreground mt-1">{notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Document Status */}
          {documents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Document Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {doc.document_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(doc.verification_status)}
                        {doc.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">{doc.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {completedSteps === totalSteps ? (
                  <div className="text-center py-4">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-green-600 mb-2">Verified!</h3>
                    <p className="text-green-600 font-medium">
                      Congratulations! Your verification is complete and you're now ready to receive booking requests!
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      To complete your verification:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {VERIFICATION_STEPS
                        .filter(step => getStepStatus(step.key) === 'pending')
                        .map(step => (
                          <li key={step.key}>Complete {step.label.toLowerCase()}</li>
                        ))}
                      {documents.length === 0 && (
                        <li>Upload required documents (ID, certifications, etc.)</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
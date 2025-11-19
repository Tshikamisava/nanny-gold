import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useVerificationWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createInterviewAfterVerification = async (nannyId: string) => {
    setLoading(true);
    try {
      // Get admin user (for now, we'll use the first admin found)
      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      if (adminError) throw adminError;
      
      if (!adminRoles || adminRoles.length === 0) {
        throw new Error('No admin found to schedule interview');
      }

      const adminId = adminRoles[0].user_id;

      // Create interview scheduled for 1 week from now at 10 AM
      const interviewDate = new Date();
      interviewDate.setDate(interviewDate.getDate() + 7);
      
      const { error: interviewError } = await supabase
        .from('interviews')
        .insert({
          client_id: adminId, // Admin creating the interview
          nanny_id: nannyId,
          interview_date: interviewDate.toISOString().split('T')[0],
          interview_time: '10:00:00',
          status: 'scheduled',
          meeting_link: 'Video call link to be provided before interview',
          notes: 'Verification interview automatically scheduled after document approval. This is your final onboarding step before becoming eligible for bookings.'
        });

      if (interviewError) throw interviewError;

      // Create notification for nanny about the interview
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: nannyId,
          title: 'Interview Scheduled - Final Onboarding Step',
          message: `Congratulations! Your documents have been verified. Your verification interview has been scheduled for ${interviewDate.toLocaleDateString()} at 10:00 AM. This is the final step before you can start receiving bookings. Please check your calendar for details.`,
          type: 'interview_scheduled',
          data: {
            interview_date: interviewDate.toISOString().split('T')[0],
            interview_time: '10:00',
            step: 'final_onboarding',
            next_action: 'attend_interview'
          }
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      toast({
        title: "Interview Scheduled",
        description: "Your verification interview has been automatically scheduled. Check your notifications and calendar for details.",
      });

      return true;
    } catch (error) {
      console.error('Error creating interview:', error);
      toast({
        title: "Interview Scheduling Failed",
        description: "We couldn't schedule your interview automatically. Our team will contact you directly.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const completeInterviewStep = async (nannyId: string, passed: boolean, notes?: string) => {
    setLoading(true);
    try {
      // Update the interview verification step
      const { error } = await supabase.rpc('update_verification_step', {
        p_nanny_id: nannyId,
        p_step_name: 'interview_completed',
        p_status: passed ? 'completed' : 'rejected',
        p_notes: notes || (passed ? 'Interview passed successfully' : 'Interview requirements not met')
      });

      if (error) throw error;

      toast({
        title: passed ? "Interview Completed" : "Interview Needs Retry",
        description: passed 
          ? "Congratulations! You've passed your verification interview and are now fully verified."
          : "Please review the feedback and we'll reschedule your interview.",
      });

      return true;
    } catch (error) {
      console.error('Error completing interview step:', error);
      toast({
        title: "Error updating interview status",
        description: "Please contact support.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestProfileResubmission = async (nannyId: string, reason: string) => {
    setLoading(true);
    try {
      // Reset nanny verification status to require resubmission
      const { error: nannyError } = await supabase
        .from('nannies')
        .update({
          verification_status: 'document_pending',
          profile_submitted_at: null,
          can_receive_bookings: false
        })
        .eq('id', nannyId);

      if (nannyError) throw nannyError;

      // Create notification to nanny
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: nannyId,
          title: 'Profile Resubmission Required',
          message: `Your profile needs to be updated and resubmitted. Reason: ${reason}`,
          type: 'profile_resubmission_required',
          data: {
            reason,
            requested_at: new Date().toISOString()
          }
        });

      if (notificationError) throw notificationError;

      toast({
        title: "Profile resubmission requested",
        description: "The nanny has been notified to update and resubmit their profile.",
      });

      return true;
    } catch (error) {
      console.error('Error requesting profile resubmission:', error);
      toast({
        title: "Error requesting resubmission",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createInterviewAfterVerification,
    completeInterviewStep,
    requestProfileResubmission,
  };
};
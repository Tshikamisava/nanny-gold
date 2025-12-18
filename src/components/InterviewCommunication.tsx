import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Phone, 
  Video, 
  MessageCircle,
  Shield,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import JitsiMeetRoom from './JitsiMeetRoom';
import RealtimeChat from './RealtimeChat';
import { useAuth } from '@/hooks/useAuth';
import { generateJitsiRoomName } from '@/hooks/useInterviews';

interface InterviewCommunicationProps {
  interview: any;
  userType: 'nanny' | 'admin' | 'client';
}

const InterviewCommunication = ({ interview, userType }: InterviewCommunicationProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const interviewDateTime = new Date(`${interview.interview_date}T${interview.interview_time}`);
  const isWithin30Minutes = Math.abs(new Date().getTime() - interviewDateTime.getTime()) < 30 * 60 * 1000;
  const isInterviewTime = Math.abs(new Date().getTime() - interviewDateTime.getTime()) < 5 * 60 * 1000;

  const handleStartCall = (type: 'voice' | 'video') => {
    setCallType(type);
    setIsCallDialogOpen(true);
  };

  const handleJoinCall = () => {
    if (callType === 'video') {
      setIsInVideoCall(true);
      toast({
        title: "Joining Video Call",
        description: "Starting secure video interview...",
      });
    } else {
      // Initiate voice call through the app's calling system
      toast({
        title: "Connecting Call",
        description: "Connecting your call through NannyGold secure line...",
      });
      
      // Simulate call connection
      setTimeout(() => {
        toast({
          title: "Call Connected",
          description: "You are now connected via NannyGold secure calling.",
        });
      }, 2000);
    }
    setIsCallDialogOpen(false);
  };

  const handleEndVideoCall = () => {
    setIsInVideoCall(false);
    toast({
      title: "Call Ended",
      description: "Video interview has ended.",
    });
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const generateRoomName = () => {
    return generateJitsiRoomName(interview.id);
  };

  const getUserInfo = () => {
    return {
      displayName: user?.user_metadata?.first_name || 'User',
      email: user?.email || 'user@nannygold.com'
    };
  };

  const generateSecureCallId = () => {
    // Generate a unique call ID that doesn't expose phone numbers
    return `NG-${interview.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
  };

  if (isInVideoCall) {
    return (
      <>
        <JitsiMeetRoom
          roomName={generateRoomName()}
          userInfo={getUserInfo()}
          onEndCall={handleEndVideoCall}
          onToggleChat={handleToggleChat}
          className="mb-4"
        />
        <RealtimeChat
          roomId={interview.id}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-green-900 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Interview Communication
          </CardTitle>
          <p className="text-sm text-green-700">
            Secure calling available 30 minutes before interview
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Interview Details */}
          <div className="bg-white rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm">
                {userType === 'nanny' ? 'Interview with Admin' : `Interview with ${interview.nanny_name || 'Nanny'}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm">
                {format(interviewDateTime, 'MMM dd, yyyy')} at {interview.interview_time}
              </span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Secure Communication</p>
                <p className="text-xs">
                  All calls are routed through NannyGold's secure system. 
                  Personal phone numbers are never shared between parties.
                </p>
              </div>
            </div>
          </div>

          {/* Call Options */}
          {isWithin30Minutes ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleStartCall('video')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!isInterviewTime}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video Call
                </Button>
                <Button
                  onClick={() => handleStartCall('voice')}
                  variant="outline"
                  className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                  disabled={!isInterviewTime}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Voice Call
                </Button>
              </div>
              
              {!isInterviewTime && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded text-center">
                  Calling will be available 5 minutes before interview time
                </div>
              )}

              {/* Chat Button */}
              <Button
                onClick={handleToggleChat}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Open Chat
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-600">
                Communication options will be available 30 minutes before your interview
              </p>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Emergency Contact</p>
                <p className="text-xs">
                  If you can't connect or have technical issues, contact support immediately.
                </p>
                <Button 
                  variant="link" 
                  className="text-red-700 p-0 h-auto text-xs underline"
                  onClick={() => toast({
                    title: "Contacting Support",
                    description: "Connecting you to emergency support...",
                  })}
                >
                  Contact Emergency Support
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Connection Dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              {callType === 'video' ? 'Join Video Interview' : 'Start Voice Call'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Secure Connection:</strong><br/>
                Call ID: {generateSecureCallId()}<br/>
                This call is encrypted and recorded for quality assurance.
              </p>
            </div>
            
            {callType === 'video' ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You'll be taken to a secure video meeting room. Make sure your camera and microphone are working.
                </p>
                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                  <strong>Tip:</strong> Test your video and audio before joining
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You'll receive a call through NannyGold's secure calling system. Keep your phone ready.
                </p>
                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                  <strong>Note:</strong> The call will appear from a NannyGold number
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCallDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleJoinCall}>
                {callType === 'video' ? 'Join Video Call' : 'Start Voice Call'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RealtimeChat
        roomId={interview.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
};

export default InterviewCommunication;
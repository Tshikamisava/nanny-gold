import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle } from 'lucide-react';

interface JitsiMeetRoomProps {
  roomName: string;
  userInfo: {
    displayName: string;
    email: string;
  };
  onEndCall?: () => void;
  onToggleChat?: () => void;
  className?: string;
}

const JitsiMeetRoom = ({ 
  roomName, 
  userInfo, 
  onEndCall,
  onToggleChat,
  className = "" 
}: JitsiMeetRoomProps) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    // Load Jitsi Meet External API script
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    
    script.onload = () => {
      if (window.JitsiMeetExternalAPI && jitsiContainerRef.current) {
        const domain = 'meet.jit.si';
        const options = {
          roomName: roomName,
          width: '100%',
          height: 500,
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: userInfo.displayName,
            email: userInfo.email,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            enableInsecureRoomNameWarning: false,
            enableWelcomePage: false,
            enableClosePage: false,
            toolbarButtons: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 
              'fullscreen', 'fodeviceselection', 'hangup', 'profile',
              'recording', 'settings', 'shareaudio', 'stats', 'tileview',
              'toggle-camera', 'videoquality'
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            DEFAULT_BACKGROUND: '#1a1a1a',
          },
        };

        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

        // Event listeners
        apiRef.current.addEventListener('videoConferenceJoined', () => {
          console.log('User joined the conference');
        });

        apiRef.current.addEventListener('videoConferenceLeft', () => {
          console.log('User left the conference');
          onEndCall?.();
        });

        apiRef.current.addEventListener('readyToClose', () => {
          onEndCall?.();
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      document.head.removeChild(script);
    };
  }, [roomName, userInfo, onEndCall]);

  const handleEndCall = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onEndCall?.();
  };

  const toggleAudio = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleVideo');
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          <div ref={jitsiContainerRef} className="w-full" />
          
          {/* Custom Control Bar */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 rounded-lg p-2 flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={toggleAudio}
            >
              <Mic className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={toggleVideo}
            >
              <Video className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={onToggleChat}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEndCall}
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Extend window type for Jitsi API
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default JitsiMeetRoom;
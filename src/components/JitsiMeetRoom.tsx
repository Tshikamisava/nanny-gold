import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Users, Settings, Maximize, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JitsiMeetRoomProps {
  roomName: string;
  userInfo: {
    displayName: string;
    email: string;
  };
  onEndCall?: () => void;
  onToggleChat?: () => void;
  className?: string;
  subject?: string;
  height?: number;
}

const JitsiMeetRoom = ({ 
  roomName, 
  userInfo, 
  onEndCall,
  onToggleChat,
  className = "",
  subject = "NannyGold Interview",
  height = 600
}: JitsiMeetRoomProps) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'non-optimal'>('good');
  const [isRecording, setIsRecording] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  // Request camera and microphone permissions before initializing Jitsi
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Permissions granted
        setPermissionsGranted(true);
        setPermissionError(null);
        
        // Stop the stream as we just needed to get permissions
        stream.getTracks().forEach(track => track.stop());
        
        toast({
          title: "Permissions Granted",
          description: "Camera and microphone access enabled.",
        });
      } catch (err: any) {
        console.error('Permission error:', err);
        setPermissionError(err.message || 'Permission denied');
        
        if (err.name === 'NotAllowedError') {
          toast({
            title: "Permission Denied",
            description: "Please allow camera and microphone access in your browser settings.",
            variant: "destructive"
          });
        } else if (err.name === 'NotFoundError') {
          toast({
            title: "Device Not Found",
            description: "No camera or microphone detected. Please connect a device.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Media Access Error",
            description: "Could not access camera/microphone. Please check your device.",
            variant: "destructive"
          });
        }
      }
    };

    // Detect mobile device
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      
      // Check orientation
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(orientation);
    };

    checkMobile();
    requestPermissions();

    // Listen for orientation changes
    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [toast]);

  useEffect(() => {
    if (!jitsiContainerRef.current || !permissionsGranted) return;

    let cleanup = false;

    // Load Jitsi Meet External API script
    const loadJitsi = () => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="external_api.js"]');
      if (existingScript) {
        initializeJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      
      script.onload = () => {
        if (!cleanup) {
          initializeJitsi();
        }
      };

      script.onerror = () => {
        setError('Failed to load video conferencing. Please check your internet connection.');
        setLoading(false);
        toast({
          title: "Connection Error",
          description: "Unable to load video conferencing. Please refresh the page.",
          variant: "destructive"
        });
      };

      document.head.appendChild(script);
    };

    const initializeJitsi = () => {
      if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) {
        setError('Video conferencing not available');
        setLoading(false);
        return;
      }

      try {
        const domain = 'meet.jit.si';
        const options = {
          roomName: roomName,
          width: '100%',
          height: height,
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: userInfo.displayName,
            email: userInfo.email,
          },
          configOverwrite: {
            prejoinPageEnabled: true,
            startWithAudioMuted: false,
            startWithVideoMuted: isMobile, // Start with video muted on mobile
            enableInsecureRoomNameWarning: false,
            enableWelcomePage: false,
            enableClosePage: false,
            disableDeepLinking: true,
            defaultLanguage: 'en',
            enableNoisyMicDetection: true,
            subject: subject,
            // Enable virtual backgrounds
            disableVirtualBackground: false,
            enableVirtualBackgroundBlur: true,
            // Mobile-specific settings
            mobile: {
              disableTileView: false,
              enableMobileAudio: true,
              enableMobileVideo: true,
            },
            // Toolbar configuration - simplified for mobile
            toolbarButtons: isMobile ? [
              'microphone', 'camera', 'hangup', 'chat', 'tileview'
            ] : [
              'microphone', 'camera', 'closedcaptions', 'desktop', 
              'fullscreen', 'fodeviceselection', 'hangup', 'profile',
              'chat', 'recording', 'livestreaming', 'etherpad', 'settings',
              'raisehand', 'videoquality', 'filmstrip', 'feedback',
              'stats', 'shortcuts', 'tileview', 'select-background',
              'download', 'help', 'mute-everyone'
            ],
            hideConferenceSubject: false,
            hideConferenceTimer: false,
            // Video quality settings - lower for mobile
            constraints: {
              video: {
                height: {
                  ideal: isMobile ? 480 : 720,
                  max: isMobile ? 480 : 720,
                  min: 240
                }
              }
            },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            DEFAULT_BACKGROUND: '#1a1a1a',
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            MOBILE_APP_PROMO: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
          },
        };

        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

        // Event listeners for better user experience
        apiRef.current.addEventListener('videoConferenceJoined', (event: any) => {
          console.log('User joined the conference', event);
          setLoading(false);
          toast({
            title: "Connected",
            description: "You've joined the video interview successfully.",
          });
        });

        apiRef.current.addEventListener('videoConferenceLeft', () => {
          console.log('User left the conference');
          onEndCall?.();
        });

        apiRef.current.addEventListener('readyToClose', () => {
          onEndCall?.();
        });

        apiRef.current.addEventListener('participantJoined', (event: any) => {
          setParticipantCount(prev => prev + 1);
          toast({
            title: "Participant Joined",
            description: `${event.displayName || 'Someone'} joined the meeting.`,
          });
        });

        apiRef.current.addEventListener('participantLeft', (event: any) => {
          setParticipantCount(prev => Math.max(1, prev - 1));
        });

        apiRef.current.addEventListener('audioMuteStatusChanged', (event: any) => {
          setIsMuted(event.muted);
        });

        apiRef.current.addEventListener('videoMuteStatusChanged', (event: any) => {
          setIsVideoOff(event.muted);
        });

        // Screen sharing events
        apiRef.current.addEventListener('screenSharingStatusChanged', (event: any) => {
          setIsScreenSharing(event.on);
        });

        // Recording events
        apiRef.current.addEventListener('recordingStatusChanged', (event: any) => {
          setIsRecording(event.on);
          setRecordingStatus(event.details?.status || null);
        });

        apiRef.current.addEventListener('errorOccurred', (event: any) => {
          console.error('Jitsi error:', event);
          setError('An error occurred during the video call');
          toast({
            title: "Call Error",
            description: "There was an issue with the video call. Please try reconnecting.",
            variant: "destructive"
          });
        });

        // Connection quality monitoring
        apiRef.current.addEventListener('connectionQualityChanged', (event: any) => {
          setConnectionQuality(event.quality);
          if (event.quality === 'poor' || event.quality === 'non-optimal') {
            toast({
              title: "Poor Connection",
              description: "Your internet connection is unstable. Video quality may be affected.",
              variant: "destructive"
            });
          }
        });

      } catch (err) {
        console.error('Error initializing Jitsi:', err);
        setError('Failed to initialize video call');
        setLoading(false);
        toast({
          title: "Initialization Error",
          description: "Could not start the video call. Please try again.",
          variant: "destructive"
        });
      }
    };

    loadJitsi();

    return () => {
      cleanup = true;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (err) {
          console.error('Error disposing Jitsi:', err);
        }
      }
    };
  }, [roomName, userInfo, onEndCall, subject, height, toast, permissionsGranted]);

  const handleEndCall = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('hangup');
      } catch (err) {
        console.error('Error ending call:', err);
      }
    }
    onEndCall?.();
  };

  const toggleAudio = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('toggleAudio');
        setIsMuted(!isMuted);
      } catch (err) {
        console.error('Error toggling audio:', err);
      }
    }
  };

  const toggleVideo = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('toggleVideo');
        setIsVideoOff(!isVideoOff);
      } catch (err) {
        console.error('Error toggling video:', err);
      }
    }
  };

  const toggleFullscreen = () => {
    if (apiRef.current) {
      try {
        if (!isFullscreen) {
          jitsiContainerRef.current?.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
        setIsFullscreen(!isFullscreen);
      } catch (err) {
        console.error('Error toggling fullscreen:', err);
      }
    }
  };

  const toggleTileView = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('toggleTileView');
      } catch (err) {
        console.error('Error toggling tile view:', err);
      }
    }
  };

  const toggleScreenShare = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('toggleShareScreen');
      } catch (err) {
        console.error('Error toggling screen share:', err);
      }
    }
  };

  const startRecording = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('startRecording', {
          mode: 'file',
          shouldShare: true
        });
      } catch (err) {
        console.error('Error starting recording:', err);
      }
    }
  };

  const stopRecording = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('stopRecording', 'file');
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    }
  };

  const openSettings = () => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('toggleSettings');
      } catch (err) {
        console.error('Error opening settings:', err);
      }
    }
  };

  if (permissionError) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>Camera/Microphone Access Required</strong>
              <p className="mt-2">{permissionError}</p>
              <p className="mt-2 text-sm">
                To join the video call, please:
              </p>
              <ol className="list-decimal ml-5 mt-2 text-sm space-y-1">
                <li>Click the camera icon in your browser's address bar</li>
                <li>Allow access to camera and microphone</li>
                <li>Reload this page</li>
              </ol>
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 w-full"
          >
            Reload Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 w-full"
            variant="outline"
          >
            Reload Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          {(!permissionsGranted || loading) && (
            <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium">
                  {!permissionsGranted ? 'Requesting camera and microphone access...' : 'Connecting to video call...'}
                </p>
                <p className="text-sm text-gray-300 mt-2">
                  {!permissionsGranted ? 'Please allow permissions in your browser' : 'Please wait while we set up your interview'}
                </p>
              </div>
            </div>
          )}
          
          <div ref={jitsiContainerRef} className="w-full rounded-lg overflow-hidden" />
          
          {/* Enhanced Control Bar - Mobile Responsive */}
          <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600/90 to-orange-400/90 backdrop-blur-md rounded-full p-2 flex gap-1 shadow-lg ${
            isMobile ? 'scale-90' : ''
          }`}>
            <Button
              size="sm"
              variant="ghost"
              className={`text-white hover:bg-white/20 rounded-full h-10 w-10 p-0 ${isMuted ? 'bg-red-500/50' : ''} ${
                isMobile ? 'h-8 w-8' : ''
              }`}
              onClick={toggleAudio}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className={`text-white hover:bg-white/20 rounded-full h-10 w-10 p-0 ${isVideoOff ? 'bg-red-500/50' : ''} ${
                isMobile ? 'h-8 w-8' : ''
              }`}
              onClick={toggleVideo}
              title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </Button>

            <div className="w-px bg-white/30 mx-1" />
            
            <Button
              size="sm"
              variant="ghost"
              className={`text-white hover:bg-white/20 rounded-full h-10 w-10 p-0 ${
                isMobile ? 'h-8 w-8' : ''
              }`}
              onClick={toggleTileView}
              title="Toggle tile view"
            >
              <Users className="w-4 h-4" />
            </Button>
            
            {onToggleChat && !isMobile && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0"
                onClick={onToggleChat}
                title="Toggle chat"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
            
            {!isMobile && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`text-white hover:bg-white/20 rounded-full h-10 w-10 p-0 ${isScreenSharing ? 'bg-blue-500/50' : ''}`}
                  onClick={toggleScreenShare}
                  title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className={`text-white hover:bg-white/20 rounded-full h-10 w-10 p-0 ${isRecording ? 'bg-red-500/50' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  <Video className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0"
                  onClick={toggleFullscreen}
                  title="Toggle fullscreen"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0"
                  onClick={openSettings}
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            )}

            <div className="w-px bg-white/30 mx-1" />
            
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white rounded-full h-10 w-10 p-0"
              onClick={handleEndCall}
              title="End call"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Orientation Warning */}
          {isMobile && orientation === 'portrait' && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 backdrop-blur-md rounded-lg px-4 py-2 text-white text-sm text-center max-w-xs">
              <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
              <p>Rotate to landscape for better video quality</p>
            </div>
          )}

          {/* Status Indicators */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {/* Connection Quality Indicator */}
            {connectionQuality !== 'good' && (
              <div className={`bg-black/70 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 text-white text-sm ${
                connectionQuality === 'poor' ? 'bg-red-500/70' : 'bg-yellow-500/70'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionQuality === 'poor' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <span>{connectionQuality === 'poor' ? 'Poor' : 'Unstable'} Connection</span>
              </div>
            )}

            {/* Recording Status */}
            {isRecording && (
              <div className="bg-red-500/70 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 text-white text-sm">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span>Recording</span>
              </div>
            )}
          </div>

          {/* Participant Count Badge */}
          {participantCount > 1 && (
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 text-white text-sm">
              <Users className="w-4 h-4" />
              <span>{participantCount} participant{participantCount > 1 ? 's' : ''}</span>
            </div>
          )}
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
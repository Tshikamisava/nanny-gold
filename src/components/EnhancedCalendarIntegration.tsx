import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, Smartphone, Monitor, Download, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CalendarIntegrationProps {
  interviewId: string;
  interviewDate: Date;
  interviewTime: string;
  nannyName: string;
  nannyEmail?: string;
  clientEmail?: string;
  onSuccess?: () => void;
  meetingLink?: string;
}

interface CalendarStatus {
  platform: string;
  status: 'pending' | 'success' | 'failed';
  eventId?: string;
  error?: string;
}

export default function EnhancedCalendarIntegration({
  interviewId,
  interviewDate,
  interviewTime,
  nannyName,
  nannyEmail,
  clientEmail,
  onSuccess,
  meetingLink
}: CalendarIntegrationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarStatuses, setCalendarStatuses] = useState<CalendarStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fetchedMeetingLink, setFetchedMeetingLink] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch meeting link from database if not provided
  useState(() => {
    if (!meetingLink && interviewId) {
      supabase
        .from('interviews')
        .select('meeting_link')
        .eq('id', interviewId)
        .single()
        .then(({ data }) => {
          if (data?.meeting_link) {
            setFetchedMeetingLink(data.meeting_link);
          }
        });
    }
  });

  const actualMeetingLink = meetingLink || fetchedMeetingLink;

  const generateCalendarEvent = () => {
    const [hours, minutes] = interviewTime.split(':').map(Number);
    const startDateTime = new Date(interviewDate);
    startDateTime.setHours(hours, minutes);

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const startTime = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const eventTitle = `Nanny Interview - ${nannyName}`;

    // Enhanced description with meeting link
    const meetingInfo = actualMeetingLink
      ? `\\n\\nJoin Video Call: ${actualMeetingLink}\\n\\n`
      : '\\n\\n';

    const eventDescription = `Interview with ${nannyName} for nanny services.${meetingInfo}Meeting Details:\\n- Date: ${interviewDate.toLocaleDateString()}\\n- Time: ${interviewTime}\\n- Duration: 1 hour\\n\\nIMPORTANT: This is a confirmed appointment scheduled by NannyGold.${nannyEmail ? `\\n\\nAttendees: ${nannyEmail}${clientEmail ? `, ${clientEmail}` : ''}` : ''}`;

    return {
      title: eventTitle,
      description: eventDescription,
      location: actualMeetingLink || '',
      startTime,
      endTime,
      startDateTime,
      endDateTime,
      attendees: [nannyEmail, clientEmail].filter(Boolean)
    };
  };

  const createCalendarEvent = async (platform: string): Promise<CalendarStatus> => {
    const event = generateCalendarEvent();

    try {
      let result: CalendarStatus = { platform, status: 'pending' };

      switch (platform) {
        case 'google': {
          const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.startTime}/${event.endTime}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&add=${event.attendees.join(',')}&trp=true`;
          window.open(googleUrl, '_blank');
          result = { platform, status: 'success', eventId: `google-${Date.now()}` };
          break;
        }

        case 'outlook': {
          const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${event.startTime}&enddt=${event.endTime}&body=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&attendees=${event.attendees.join(';')}`;
          window.open(outlookUrl, '_blank');
          result = { platform, status: 'success', eventId: `outlook-${Date.now()}` };
          break;
        }

        case 'apple': {
          // For Apple Calendar, create proper ICS file
          const appleIcsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NannyGold//EN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${event.startTime}
DTEND:${event.endTime}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
${event.location ? `LOCATION:${event.location}` : ''}
${event.location ? `URL:${event.location}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
CLASS:PUBLIC
${event.attendees.map(email => `ATTENDEE;CN=${email}:mailto:${email}`).join('\\n')}
UID:${Date.now()}-apple@nannygold.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`;

          const blob = new Blob([appleIcsContent], { type: 'text/calendar' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'interview.ics';
          a.click();
          URL.revokeObjectURL(url);

          result = { platform, status: 'success', eventId: `apple-${Date.now()}` };
          break;
        }

        case 'ics': {
          // Generate ICS file with meeting link
          const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NannyGold//EN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${event.startTime}
DTEND:${event.endTime}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
${event.location ? `LOCATION:${event.location}` : ''}
${event.location ? `URL:${event.location}` : ''}
STATUS:CONFIRMED
TRANSP:OPAQUE
SEQUENCE:0
CLASS:PUBLIC
${event.attendees.map(email => `ATTENDEE;CN=${email}:mailto:${email}`).join('\\n')}
UID:${Date.now()}@nannygold.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`;

          const icsBlob = new Blob([icsContent], { type: 'text/calendar' });
          const icsUrl = URL.createObjectURL(icsBlob);
          const icsLink = document.createElement('a');
          icsLink.href = icsUrl;
          icsLink.download = `interview-${nannyName.replace(/\s+/g, '-').toLowerCase()}.ics`;
          icsLink.click();
          URL.revokeObjectURL(icsUrl);

          result = { platform, status: 'success', eventId: `ics-${Date.now()}` };
          break;
        }
      }

      // Store calendar event in database
      if (result.status === 'success' && result.eventId) {
        await supabase.from('calendar_events').insert({
          interview_id: interviewId,
          platform,
          event_id: result.eventId,
          attendee_email: clientEmail || 'unknown@email.com',
          status: 'created'
        });
      }

      return result;
    } catch (error) {
      console.error(`Failed to create ${platform} calendar event:`, error);
      return {
        platform,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const handleCreateCalendarEvents = async () => {
    setIsProcessing(true);
    const platforms = ['google', 'outlook', 'apple', 'ics'];
    const results: CalendarStatus[] = [];

    for (const platform of platforms) {
      const result = await createCalendarEvent(platform);
      results.push(result);
      setCalendarStatuses([...results]);

      // Small delay between each platform
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update interview record
    try {
      await supabase
        .from('interviews')
        .update({
          calendar_event_created: true,
          calendar_sync_status: 'completed',
          calendar_event_data: {
            platforms: results.map(r => ({
              platform: r.platform,
              status: r.status,
              eventId: r.eventId,
              error: r.error
            }))
          } as any
        })
        .eq('id', interviewId);
    } catch (error) {
      console.error('Failed to update interview record:', error);
    }

    setIsProcessing(false);

    const successCount = results.filter(r => r.status === 'success').length;
    toast({
      title: "Calendar Events Created",
      description: `Successfully created ${successCount} calendar events across different platforms.`,
      duration: 5000
    });

    onSuccess?.();
  };

  const detectPlatform = () => {
    const userAgent = navigator.userAgent;
    if (/Mac/.test(userAgent)) return 'apple';
    if (/Windows/.test(userAgent)) return 'outlook';
    return 'google';
  };

  const handleQuickAdd = async () => {
    const platform = detectPlatform();
    setIsProcessing(true);

    const result = await createCalendarEvent(platform);
    setCalendarStatuses([result]);
    setIsProcessing(false);

    if (result.status === 'success') {
      toast({
        title: "Calendar Event Added",
        description: `Successfully added interview to your ${platform} calendar.`,
      });
      onSuccess?.();
    } else {
      toast({
        title: "Failed to Add Event",
        description: result.error || "Please try adding manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Button onClick={handleQuickAdd} disabled={isProcessing} className="w-full">
          <Calendar className="w-4 h-4 mr-2" />
          {isProcessing ? 'Adding to Calendar...' : 'Quick Add to Calendar'}
        </Button>

        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Advanced Calendar Options
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Add to Calendar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Interview Details:</p>
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <p><strong>Date:</strong> {interviewDate.toLocaleDateString()}</p>
                <p><strong>Time:</strong> {interviewTime}</p>
                <p><strong>Nanny:</strong> {nannyName}</p>
              </div>
            </div>

            {calendarStatuses.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to add this interview to your calendar:
                </p>

                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    onClick={() => createCalendarEvent('google')}
                    className="justify-start"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Google Calendar
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => createCalendarEvent('outlook')}
                    className="justify-start"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Outlook Calendar
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => createCalendarEvent('apple')}
                    className="justify-start"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Apple Calendar
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => createCalendarEvent('ics')}
                    className="justify-start"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download ICS File
                  </Button>
                </div>

                <Button
                  onClick={handleCreateCalendarEvents}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Creating Events...' : 'Add to All Calendars'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Calendar Integration Status:</p>

                {calendarStatuses.map((status) => (
                  <div key={status.platform} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm capitalize">{status.platform} Calendar</span>
                    <div className="flex items-center gap-2">
                      {status.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {status.status === 'failed' && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <Badge
                        variant={
                          status.status === 'success' ? 'default' :
                            status.status === 'failed' ? 'destructive' : 'secondary'
                        }
                      >
                        {status.status}
                      </Badge>
                    </div>
                  </div>
                ))}

                <Button onClick={() => setIsOpen(false)} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
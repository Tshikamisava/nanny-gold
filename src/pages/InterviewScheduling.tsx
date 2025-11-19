import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar as CalendarIcon, User, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useCreateInterview } from "@/hooks/useInterviews";
import { useAuthContext } from "@/components/AuthProvider";
import EnhancedCalendarIntegration from "@/components/EnhancedCalendarIntegration";

const InterviewScheduling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const createInterview = useCreateInterview();
  const [searchParams] = useSearchParams();
  const nannyId = searchParams.get('nannyId');
  const nannyName = searchParams.get('nannyName') || 'Nanny';
  const nannyEmail = searchParams.get('nannyEmail') || '';
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [interviewCreated, setInterviewCreated] = useState<string | null>(null);

  // Available time slots
  const timeSlots = [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
  ];

  // Function to check if date is available and clickable - simplified to allow more dates
  const isDateAvailable = (date: Date) => {
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setMonth(futureLimit.getMonth() + 3); // Allow booking up to 3 months in advance
    
    return date >= today && date <= futureLimit;
  };

  const createCalendarEvent = async (): Promise<boolean> => {
    if (!selectedDate || !selectedTime) return false;

    try {
      const interviewDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      interviewDateTime.setHours(hours, minutes);
      
      // Format for calendar URLs
      const startTime = interviewDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDateTime = new Date(interviewDateTime.getTime() + 60 * 60 * 1000); // 1 hour later
      const endTime = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      const eventTitle = `Nanny Interview - ${nannyName} [CONFIRMED]`;
      const eventDescription = `CONFIRMED INTERVIEW APPOINTMENT\\n\\nInterview with ${nannyName} for nanny services\\n\\nIMPORTANT: This is a confirmed appointment scheduled by NannyGold. Only NannyGold can modify or cancel this meeting.\\n\\nAttendees are expected to attend as scheduled.${nannyEmail ? `\\n\\nNanny Email: ${nannyEmail}` : ''}`;
      const attendees = nannyEmail ? `&add=${encodeURIComponent(nannyEmail)}` : '';
      
      // Detect device type
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        // Try iOS native calendar first
        const iosCalendarUrl = `calshow:${startTime}`;
        window.location.href = iosCalendarUrl;
        
        // Fallback to iOS calendar app
        setTimeout(() => {
          const iosUrl = `webcal://calendar.google.com/calendar/ical?title=${encodeURIComponent(eventTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(eventDescription)}${attendees}`;
          window.location.href = iosUrl;
        }, 1000);
        
      } else if (isAndroid) {
        // Android calendar intent with confirmed status
        const androidUrl = `intent://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(eventDescription)}${attendees}&trp=true#Intent;scheme=https;package=com.google.android.calendar;end`;
        window.location.href = androidUrl;
        
      } else {
        // Desktop - Google Calendar with confirmed status
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(eventDescription)}${attendees}&trp=true`;
        window.open(googleCalendarUrl, '_blank');
      }

      // Also create downloadable .ics file as fallback with confirmed status
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nanny Gold//EN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${eventTitle}
DESCRIPTION:${eventDescription.replace(/\\n/g, '\\n')}
STATUS:CONFIRMED
TRANSP:OPAQUE
SEQUENCE:0
CLASS:PUBLIC${nannyEmail ? `\\nORGANIZER;CN=NannyGold:mailto:booking@nannygold.co.za\\nATTENDEE;CN=${nannyName};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${nannyEmail}` : ''}
UID:${Date.now()}@nannygold.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT
END:VCALENDAR`;
      
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'interview.ics';
      a.click();
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Calendar integration failed:', error);
      return false;
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Please select date and time",
        description: "Both date and time are required to schedule an interview.",
        variant: "destructive"
      });
      return;
    }

    // Check if nannyId is valid UUID format - if not, this is a demo/mock nanny
    if (!nannyId || nannyId.startsWith('mock-')) {
      toast({
        title: "Demo Mode",
        description: "This is a demo nanny. Interview scheduling is not available for demo profiles.",
        variant: "destructive"
      });
      return;
    }

    setIsScheduling(true);

    try {
      // Create interview in database (Jitsi link will be auto-generated)
      const result = await createInterview.mutateAsync({
        nanny_id: nannyId!,
        interview_date: selectedDate.toISOString().split('T')[0],
        interview_time: selectedTime,
        notes: `Interview scheduled with ${nannyName}`
      });
      
      // Store the created interview ID and meeting link for calendar integration
      setInterviewCreated(result.id);

      toast({
        title: "Interview Scheduled!",
        description: `Interview with ${nannyName} scheduled for ${selectedDate.toLocaleDateString()} at ${selectedTime}. Please add to your calendar.`,
        duration: 3000
      });

    } catch (error) {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule interview. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCalendarSuccess = () => {
    // Navigate back to dashboard interviews tab after calendar integration
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handleTryAgain = () => {
    handleScheduleInterview();
  };

  const handleManualSchedule = async () => {
    if (!selectedDate || !selectedTime || !nannyId) return;
    
    try {
      await createInterview.mutateAsync({
        nanny_id: nannyId,
        interview_date: selectedDate.toISOString().split('T')[0],
        interview_time: selectedTime,
        notes: `Manual scheduling - Interview with ${nannyName}`
      });

      toast({
        title: "Interview Saved",
        description: `Interview details saved. Please manually add to your calendar: ${selectedDate?.toLocaleDateString()} at ${selectedTime}`,
        duration: 4000
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save interview:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">
        {/* Back Navigation */}
        <div className="absolute top-8 left-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/match-results')}
            className="text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* NannyGold Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-2">
            <span className="text-primary">Nanny</span>
            <span className="gold-shimmer">Gold</span>
          </h1>
          <p className="text-muted-foreground text-lg">Schedule your interview</p>
        </div>

        {/* Interview Scheduling Form */}
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Interview with {nannyName}
            </h2>
            <p className="text-muted-foreground">
              Select your preferred date and time
            </p>
          </div>

          <Card className="p-6 rounded-2xl border-primary/20">
            <div className="space-y-6">
              {/* Date Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
                  Select Date
                </label>
                <div className="w-full">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !isDateAvailable(date)}
                    className="rounded-md border border-border p-3 w-full mx-auto pointer-events-auto"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
                      day_today: "bg-secondary text-secondary-foreground font-bold",
                      day: "hover:bg-accent focus:bg-accent cursor-pointer h-9 w-9 p-0 font-normal aria-selected:opacity-100 pointer-events-auto",
                      day_disabled: "text-muted-foreground cursor-not-allowed opacity-50 pointer-events-none",
                      cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 pointer-events-auto",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 cursor-pointer pointer-events-auto",
                      table: "w-full border-collapse space-y-1 pointer-events-auto",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-sm",
                      row: "flex w-full mt-2"
                    }}
                    initialFocus={false}
                    showOutsideDays={true}
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" />
                  Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      onClick={() => setSelectedTime(time)}
                      className={
                        selectedTime === time 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "border-primary/20 text-foreground hover:bg-primary/10"
                      }
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-4">
            {!interviewCreated ? (
              <Button 
                onClick={handleScheduleInterview}
                disabled={!selectedDate || !selectedTime || isScheduling}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {isScheduling ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Interview Scheduled!</p>
                  <p className="text-green-600 text-sm">Now add it to your calendar</p>
                </div>
                
                <EnhancedCalendarIntegration
                  interviewId={interviewCreated}
                  interviewDate={selectedDate!}
                  interviewTime={selectedTime}
                  nannyName={nannyName}
                  nannyEmail={nannyEmail}
                  clientEmail={user?.email}
                  onSuccess={handleCalendarSuccess}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewScheduling;

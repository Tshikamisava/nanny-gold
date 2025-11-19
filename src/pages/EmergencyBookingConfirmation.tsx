import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, CheckCircle, Phone } from "lucide-react";
import { useBooking } from "@/contexts/BookingContext";
import { useEffect } from "react";

const EmergencyBookingConfirmation = () => {
  const navigate = useNavigate();
  const { preferences, selectedNanny } = useBooking();
  
  useEffect(() => {
    console.log('🚨 Emergency booking confirmation loaded:', {
      bookingType: preferences?.bookingSubType,
      selectedDates: preferences?.selectedDates,
      timeSlots: preferences?.timeSlots,
      selectedNanny: selectedNanny?.id,
      livingArrangement: preferences?.livingArrangement
    });
  }, [preferences, selectedNanny]);

  const handleNeedHelp = () => {
    const choice = confirm("Choose your preferred contact method:\nOK for Email\nCancel for WhatsApp");
    
    if (choice) {
      // Open email
      window.open('mailto:care@nannygold.co.za?subject=Emergency Booking Help', '_blank');
    } else {
      // Open WhatsApp
      window.open('https://wa.me/27123456789?text=Hi, I need help with my emergency booking request', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6">
      <div className="max-w-sm mx-auto w-full">
        {/* NannyGold Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-2">
            <span className="text-primary">Nanny</span>
            <span className="gold-shimmer">Gold</span>
          </h1>
          <p className="text-muted-foreground text-lg">Emergency Request Submitted</p>
        </div>

        <Card className="rounded-2xl border-red-300 bg-red-50 mb-6">
          <CardHeader className="bg-red-100 rounded-t-2xl border-b border-red-200">
            <CardTitle className="text-red-800 text-center flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Emergency Request Active
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
              <h2 className="text-xl font-semibold text-red-800">
                Your request has been sent!
              </h2>
              <p className="text-red-700">
                We've notified all available emergency nannies in your area. 
                You'll receive confirmation within <strong>2 hours</strong>.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-primary/20 mb-6">
          <CardHeader>
            <CardTitle className="text-primary text-center flex items-center justify-center gap-2">
              <Clock className="w-5 h-5" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  1
                </div>
                <p className="text-sm text-foreground">
                  <strong>Right now:</strong> Emergency nannies are being notified
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  2
                </div>
                <p className="text-sm text-foreground">
                  <strong>Within 1 hour:</strong> Available nannies will respond to your request
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                  3
                </div>
                <p className="text-sm text-foreground">
                  <strong>Within 2 hours:</strong> A verified nanny will arrive at your location
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm text-primary font-medium text-center">
                We'll send you updates via SMS and push notifications
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-orange-200 bg-orange-50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm text-orange-800 font-medium">
                  Need immediate assistance?
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Our emergency support team is available 24/7
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-2xl font-semibold"
          >
            Go to Dashboard
          </Button>
          
          <Button
            variant="outline"
            onClick={handleNeedHelp}
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 rounded-2xl"
          >
            Contact Emergency Support
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full text-muted-foreground hover:bg-accent rounded-2xl"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyBookingConfirmation;
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBooking } from "@/contexts/BookingContext";
const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { preferences, selectedNanny } = useBooking();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending' | 'pending_verification'>('pending');
  const reference = searchParams.get('reference');
  
  // Check if this is an EFT payment
  const isEFTPayment = location.state?.paymentMethod === 'eft';

  useEffect(() => {
    const verifyPayment = async () => {
      // Handle EFT payments - they don't need Paystack verification
      if (isEFTPayment) {
        setIsVerifying(false);
        setPaymentStatus('pending_verification');
        return;
      }
      
      if (!reference) {
        setIsVerifying(false);
        setPaymentStatus('failed');
        toast({
          title: "Verification Error",
          description: "No payment reference found. Please try again.",
          variant: "destructive"
        });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { reference }
        });

        if (error) {
          throw error;
        }

        if (data.success && data.data.status === 'success') {
          setPaymentStatus('success');
          
          // Save payment reference and create actual booking
          if (user) {
        try {
          // Get booking data from localStorage first, then use context as fallback
          const storedBooking = localStorage.getItem('currentBooking');
          let bookingData = null;
          
          if (storedBooking) {
            bookingData = JSON.parse(storedBooking);
          }
          
          // Use context data as fallback if localStorage is missing
          const finalSelectedNanny = bookingData?.selectedNanny || selectedNanny;
          const finalPreferences = bookingData?.preferences || preferences;
          
          
          // Payment verification only - booking already created in PaymentScreen
          // No duplicate booking creation needed here

          // First get current payment references
          const {
            data: currentClient
          } = await supabase.from('clients').select('payment_references').eq('id', user.id).single();
          const currentReferences = currentClient?.payment_references || [];
          const updatedReferences = [...currentReferences, reference];

          // Update client profile with payment reference
          const {
            error: clientError
          } = await supabase.from('clients').update({
            payment_references: updatedReferences,
            last_payment_reference: reference
          }).eq('id', user.id);
          if (clientError) {
            console.error('Error saving payment reference:', clientError);
          }
            } catch (error) {
              console.error('Error creating booking and updating client profile:', error);
            }
          }
          
          toast({
            title: "Payment Successful",
            description: "Your booking has been confirmed!"
          });
        } else {
          setPaymentStatus('failed');
          toast({
            title: "Payment Failed",
            description: "There was an issue with your payment. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        setPaymentStatus('failed');
        toast({
          title: "Verification Error",
          description: "Could not verify payment status. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setIsVerifying(false);
      }
    };
    verifyPayment();
  }, [reference, toast, user, selectedNanny, preferences, isEFTPayment]);

  // Auto redirect - different timings for different payment methods
  useEffect(() => {
    if (paymentStatus === 'success') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (paymentStatus === 'pending_verification') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, navigate]);

  if (isVerifying) {
    return <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Verifying your payment...</p>
            </div>
          </div>
        </div>
      </div>;
  }

  if (paymentStatus === 'pending_verification') {
    return <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-secondary/20">
              <CheckCircle className="w-10 h-10 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Booking Pending Verification
            </h1>
            <p className="text-muted-foreground mb-6">
              Your proof of payment has been uploaded successfully. Our team will verify your payment within 2 hours.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You'll receive a notification once your booking is confirmed.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full royal-gradient hover:opacity-90 text-white mb-4">
              View Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/support-center')} className="w-full border-primary/20 text-primary hover:bg-primary/5">
              Contact Support
            </Button>
          </div>
        </div>
      </div>;
  }

  if (paymentStatus === 'failed') {
    return <div className="min-h-screen bg-background px-6 py-8">
        <div className="max-w-sm mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-200">
              <CheckCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Payment Failed
            </h1>
            <p className="text-muted-foreground mb-6">
              There was an issue processing your payment.
            </p>
            <Button onClick={() => navigate('/payment')} className="w-full royal-gradient hover:opacity-90 text-white mb-4">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/match-results')} className="w-full border-primary/20 text-primary hover:bg-primary/5">
              Try Different Nanny
            </Button>
          </div>
        </div>
      </div>;
  }

  return <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-secondary/20">
            <CheckCircle className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Booking Confirmed! 🎉
          </h1>
          <p className="text-muted-foreground mb-2">
            You're all set! Your perfect nanny match is ready to provide
          </p>
          <p className="text-secondary font-medium">
            quality care and peace of mind for your family ✨
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Redirecting to your dashboard in a moment...
          </p>
        </div>

        <Card className="rounded-xl royal-shadow mb-6 border-border">
          <CardContent className="p-0">
            <div className="relative w-full h-48">
              <img 
                src="/lovable-uploads/9842a373-b02a-4a27-a2b1-c24715ef8c46.png" 
                alt="Mother holding sleeping baby - peaceful moment representing quality childcare" 
                className="w-full h-full object-cover rounded-xl" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default BookingConfirmation;
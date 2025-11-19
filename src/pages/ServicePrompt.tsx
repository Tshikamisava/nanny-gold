import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Calendar, Heart, ArrowLeft } from "lucide-react";
import { useBooking } from "@/contexts/BookingContext";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const ServicePrompt = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    updatePreferences
  } = useBooking();
  const [userName, setUserName] = useState("User");
  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        const {
          data: profile
        } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
        if (profile && profile.first_name) {
          setUserName(profile.first_name);
        }
      }
    };
    fetchUserName();
  }, [user]);
  const handleSelection = (durationType: 'short_term' | 'long_term') => {
    // Update preferences with duration type
    updatePreferences({
      durationType
    });
    console.log("Duration selected:", durationType);
    if (durationType === 'long_term') {
      navigate('/living-arrangement');
    } else {
      // Route to new short-term booking flow
      navigate('/short-term-booking');
    }
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 relative">
        {/* Back Navigation */}
        <div className="absolute top-8 left-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-primary hover:bg-primary/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* NannyGold Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-2">
            <span className="text-primary">Nanny</span>
            <span className="gold-shimmer">Gold</span>
          </h1>
          <p className="text-muted-foreground text-lg">Welcome, {userName}!</p>
        </div>

        {/* Service Selection */}
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Which nanny support do you need today?
            </h2>
            <p className="text-muted-foreground">
              Choose the option that best fits your needs
            </p>
          </div>

          <div className="space-y-4">
            <Card className="p-6 rounded-2xl border-primary/20 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40" onClick={() => handleSelection('short_term')}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Short-Term
                </h3>
                <p className="text-muted-foreground">Date nights, school holidays, or interim support (5hrs - 1 month)</p>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl border-primary/20 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40" onClick={() => handleSelection('long_term')}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Long-Term
                </h3>
                <p className="text-muted-foreground">Regular, full-time support</p>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>;
};
export default ServicePrompt;

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@/contexts/BookingContext";
import { Home, UserCheck, UserX, Crown } from "lucide-react";
import { useAuthContext } from "@/components/AuthProvider";
import { openBespokeEmail } from "@/utils/bespokeEmailHelper";

const LivingArrangement = () => {
  const navigate = useNavigate();
  const { updatePreferences, preferences } = useBooking();
  const { user } = useAuthContext();

  const handleSelection = (arrangement: 'live-in' | 'live-out') => {
    // Update preferences with living arrangement
    updatePreferences({ livingArrangement: arrangement });
    navigate('/schedule-builder');
  };

  const handleBespokeSelection = () => {
    openBespokeEmail({ bookingType: 'long_term' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        {/* NannyGold Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-2">
            <span className="text-primary">Nanny</span>
            <span className="gold-shimmer">Gold</span>
          </h1>
          <p className="text-muted-foreground text-lg">What type of support are you looking for?</p>
        </div>

        {/* Living Arrangement Selection */}
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Choose your preferred living arrangement
            </h2>
          </div>

          <div className="space-y-4">
            <Card 
              className="p-6 rounded-2xl border-primary/20 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40"
              onClick={() => handleSelection('live-in')}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <div className="relative">
                    <Home className="w-8 h-8 text-primary" />
                    <UserCheck className="w-4 h-4 text-primary absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Live-In Nanny
                </h3>
                <p className="text-muted-foreground">
                  Full-time support with accommodation provided
                </p>
              </div>
            </Card>

            <Card 
              className="p-6 rounded-2xl border-primary/20 cursor-pointer hover:shadow-lg transition-all hover:border-primary/40"
              onClick={() => handleSelection('live-out')}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <div className="relative">
                    <Home className="w-6 h-6 text-primary" />
                    <UserX className="w-5 h-5 text-primary absolute -top-1 -right-2" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Live-Out Nanny
                </h3>
                <p className="text-muted-foreground">
                  Regular care during agreed hours, returns home daily
                </p>
              </div>
            </Card>

            {/* Only show Bespoke option for Epic Estates clients */}
            {preferences.homeSize === 'epic_estates' && (
              <Card 
                className="p-6 rounded-2xl border-accent/30 cursor-pointer hover:shadow-lg transition-all hover:border-accent/50 bg-gradient-to-br from-accent/5 to-accent/10"
                onClick={handleBespokeSelection}
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center border-2 border-accent/30">
                    <Crown className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Bespoke Arrangement
                  </h3>
                  <p className="text-muted-foreground">
                    Custom solution tailored to your unique needs
                  </p>
                  <p className="text-sm text-accent mt-2 font-medium">
                    Contact us for personalized service
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivingArrangement;

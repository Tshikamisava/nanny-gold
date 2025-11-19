import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Shield, Star, Heart } from "lucide-react";
const TrustVerification = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
            <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
            <div className="w-2 h-2 bg-muted rounded-full"></div>
            <div className="w-2 h-2 bg-muted rounded-full"></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-secondary/20">
            <Shield className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Trust & Safety
          </h1>
          
        </div>

        <div className="space-y-6">
          <Card className="rounded-xl royal-shadow border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Verified & Trusted</h3>
                  <p className="text-sm text-muted-foreground">Handpicked and carefully screened for your peace of mind</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl royal-shadow border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center border border-secondary/20">
                  <Star className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Primed & Prepped</h3>
                  <p className="text-sm text-muted-foreground">Armed with practical knowledge & skills</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl royal-shadow border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center border border-red-300">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">First-Aid Trained</h3>
                  <p className="text-sm text-muted-foreground">Trained in emergency response &amp; child safety</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <Button onClick={() => navigate('/match-results')} className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold mt-8 border-2 border-primary/20 shadow-lg">
          View My Matches
        </Button>
      </div>
    </div>;
};
export default TrustVerification;
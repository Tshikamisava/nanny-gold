import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { NannyGoldLogo } from "@/components/NannyGoldLogo";


const LandingScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-8">
          <NannyGoldLogo size="md" />
          <p className="text-gray-700 text-base font-normal">Premium child and home care at your fingertips</p>

          <div className="space-y-3 w-full max-w-sm">
            <Button 
              onClick={() => navigate('/enhanced-signup')} 
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg text-base font-medium"
            >
              Get Started
            </Button>

            <Button 
              variant="outline" 
              onClick={() => navigate('/login')} 
              className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors py-3 rounded-lg text-base font-medium"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";


const LandingScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="text-fuchsia-600">Nanny</span>
            <span className="gold-shimmer">Gold</span>
          </h1>
          <p className="text-gray-600 text-lg">Premium child and home care at your fingertips</p>

          <div className="space-y-4 w-full max-w-sm">
            <Button onClick={() => navigate('/enhanced-signup')} className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white py-3">
              Get Started
            </Button>

            <Button variant="outline" onClick={() => navigate('/login')} className="w-full border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-colors">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;
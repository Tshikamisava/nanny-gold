
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const ReviewScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Mock data - in production this would come from navigation state
  const nannyDetails = {
    id: "mock-nanny-id", // This would come from navigation state
    name: "Sarah Johnson",
    photo: "👩‍🦱"
  };
  
  // Mock booking ID - this would come from navigation state  
  const bookingId = "mock-booking-id";

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a review.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Submit review to database
      const { error } = await supabase
        .from('reviews')
        .insert({
          nanny_id: nannyDetails.id,
          client_id: user.id,
          rating,
          comment,
          booking_id: bookingId
        });

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
      
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 to-amber-50 px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center border-2 border-amber-300">
            <Star className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-fuchsia-900 mb-2">
            Rate Your Experience
          </h1>
          <p className="text-gray-600">
            Help other families with your feedback
          </p>
        </div>

        <Card className="rounded-xl royal-shadow border-amber-200">
          <CardHeader className="bg-gradient-to-r from-fuchsia-50 to-amber-50 rounded-t-xl border-b border-amber-200">
            <CardTitle className="text-fuchsia-900 text-center">
              How was your experience with {nannyDetails.name}?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Nanny Info */}
            <div className="text-center">
              <div className="text-4xl mb-2">{nannyDetails.photo}</div>
              <h3 className="font-semibold text-fuchsia-900">{nannyDetails.name}</h3>
            </div>

            {/* Star Rating */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Tap to rate</p>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'text-amber-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium text-fuchsia-900 mb-2 block">
                Share your experience (optional)
              </label>
              <Textarea
                placeholder="Tell other parents about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="rounded-xl border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 min-h-[100px]"
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={rating === 0}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:from-fuchsia-700 hover:to-amber-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 border-2 border-amber-300 shadow-lg"
            >
              Submit Review
            </Button>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="w-full mt-6 border-amber-300 text-fuchsia-700 hover:bg-amber-50 rounded-xl"
        >
          Skip for Now
        </Button>
      </div>
    </div>
  );
};

export default ReviewScreen;

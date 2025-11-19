import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Calendar, MapPin, Medal, Heart, Award, Users, Clock, Loader2, AlertCircle } from "lucide-react";
import { useBooking } from "@/contexts/BookingContext";
import { useNannyProfile } from "@/hooks/useNannies";

const NannyProfile = () => {
  const { nannyId } = useParams<{ nannyId: string }>();
  const navigate = useNavigate();
  const { setSelectedNanny } = useBooking();
  
  const { data: nanny, isLoading, error } = useNannyProfile(nannyId || "");

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading nanny profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !nanny) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Card className="text-center py-20">
            <CardContent>
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Nanny Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The nanny profile you're looking for doesn't exist or is no longer available.
              </p>
              <Button onClick={() => navigate('/match-results')}>
                View All Nannies
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleBookNanny = () => {
    setSelectedNanny(nanny);
    navigate('/payment');
  };

  const handleScheduleInterview = () => {
    navigate(`/interview-scheduling?nannyId=${nanny.id}&nannyName=${nanny.profiles?.first_name} ${nanny.profiles?.last_name}`);
  };

  // Helper function to get profile image with fallback
  const getProfileImage = () => {
    return nanny.profiles?.avatar_url || "/placeholder.svg";
  };

  // Helper function to format experience level
  const getExperienceLevel = (level: string) => {
    const levels = {
      '1-3': '1-3 years',
      '3-6': '3-6 years', 
      '6+': '6+ years'
    };
    return levels[level as keyof typeof levels] || level;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Button 
          onClick={() => navigate(-1)} 
          variant="ghost" 
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>

        {/* Profile Header Card */}
        <Card className="mb-6 overflow-hidden border-0 shadow-lg bg-background/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img 
                    src={getProfileImage()} 
                    alt={`${nanny.profiles?.first_name} ${nanny.profiles?.last_name}`}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  {nanny.is_verified && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                      <Medal className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    {nanny.profiles?.first_name} {nanny.profiles?.last_name}
                  </h1>
                  
                  <div className="flex items-center gap-3 text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{nanny.rating || 0}</span>
                      <span className="text-sm">({nanny.total_reviews || 0} reviews)</span>
                    </div>
                    
                    {nanny.profiles?.location && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{nanny.profiles.location}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {getExperienceLevel(nanny.experience_level)}
                    </Badge>
                    
                    {nanny.approval_status === 'approved' && (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        <Award className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-2xl font-bold text-primary">
                    R{nanny.monthly_rate?.toLocaleString()}/month
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-6 bg-background">
              <div className="flex gap-3">
                <Button 
                  onClick={handleBookNanny}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-3 rounded-xl shadow-lg"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
                
                <Button 
                  onClick={handleScheduleInterview}
                  variant="outline" 
                  className="flex-1 border-primary/30 text-primary hover:bg-primary/5 font-semibold py-3 rounded-xl"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Interview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="mb-6 border-0 shadow-lg bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {nanny.bio || "Professional nanny dedicated to providing exceptional childcare services."}
            </p>
          </CardContent>
        </Card>

        {/* Services & Skills */}
        <Card className="mb-6 border-0 shadow-lg bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Services & Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Languages */}
            {nanny.languages && nanny.languages.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {nanny.languages.map((language, index) => (
                    <Badge key={index} variant="outline">{language}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {nanny.skills && nanny.skills.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {nanny.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {nanny.certifications && nanny.certifications.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {nanny.certifications.map((cert, index) => (
                    <Badge key={index} variant="default" className="bg-primary/10 text-primary">
                      <Award className="w-3 h-3 mr-1" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card className="mb-6 border-0 shadow-lg bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Experience Level</p>
                  <p className="text-sm text-muted-foreground">{getExperienceLevel(nanny.experience_level)} of professional childcare</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <Star className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Rating & Reviews</p>
                  <p className="text-sm text-muted-foreground">
                    {nanny.rating || 0}/5 rating from {nanny.total_reviews || 0} families
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Section */}
        <Card className="mb-6 border-0 shadow-lg bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {(!nanny.reviews || nanny.reviews.length === 0) ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reviews yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Be the first to book and leave a review!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {nanny.reviews.map((review: any, index: number) => (
                  <div key={index} className="p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < (review.rating || 0) ? 'fill-current' : 'text-muted-foreground'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-medium text-sm">{review.client_name || 'Anonymous'}</span>
                      {review.created_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NannyProfile;
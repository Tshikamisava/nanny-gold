import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ArrowLeft, 
  MapPin, 
  Star, 
  Calendar, 
  DollarSign, 
  MessageCircle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from '@/hooks/use-toast';

interface FavoriteNanny {
  id: string;
  nanny_id: string;
  created_at: string;
  nanny: {
    id: string;
    bio: string;
    experience_level: string;
    languages: string[];
    monthly_rate: number;
    rating: number;
    total_reviews: number;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
      location?: string;
    };
  };
}

export default function ClientFavorites() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [favorites, setFavorites] = useState<FavoriteNanny[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favorite_nannies')
        .select(`
          id,
          nanny_id,
          created_at,
          nanny:nannies(
            id,
            bio,
            experience_level,
            languages,
            monthly_rate,
            rating,
            total_reviews,
            profiles:profiles(
              first_name,
              last_name,
              email,
              location
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load your favorite nannies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorite_nannies')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      toast({
        title: "Removed from favorites",
        description: "The nanny has been removed from your favorites",
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  const FavoriteCard = ({ favorite }: { favorite: FavoriteNanny }) => {
    const { nanny } = favorite;
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm sm:text-base md:text-lg">
                {nanny.profiles.first_name?.[0]}{nanny.profiles.last_name?.[0]}
              </div>
            </div>
            
            {/* Nanny Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">
                    {nanny.profiles.first_name} {nanny.profiles.last_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{nanny.profiles.location || 'Location not specified'}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFavorite(favorite.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </Button>
              </div>
              
              {/* Rating and Reviews */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{nanny.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({nanny.total_reviews} reviews)
                  </span>
                </div>
                <Badge variant="outline">
                  {nanny.experience_level}
                </Badge>
              </div>
              
              {/* Bio */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {nanny.bio}
              </p>
              
              {/* Languages */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium">Languages:</span>
                <div className="flex gap-1">
                  {nanny.languages?.map((lang, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {lang}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">Not specified</span>}
                </div>
              </div>
              
              {/* Rate and Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-1 text-base sm:text-lg font-semibold text-primary">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>R{nanny.monthly_rate?.toLocaleString() || 'TBD'}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground font-normal">/month</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/nanny-profile/${nanny.id}`)}
                    className="flex-1 sm:flex-none"
                  >
                    View Profile
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/interview-scheduling', { state: { nannyId: nanny.id } })}
                    className="flex-1 sm:flex-none"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Interview
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Added to favorites date */}
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            Added to favorites on {new Date(favorite.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Heart className="w-8 h-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Favorite Nannies</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your saved nannies and childcare specialists
          </p>
        </div>
      </div>

      {/* Favorites List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Saved Nannies ({favorites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Favorites Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start browsing nannies and save your favorites to see them here
              </p>
              <Button onClick={() => navigate('/service-prompt')}>
                Find Nannies
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => (
                <FavoriteCard key={favorite.id} favorite={favorite} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
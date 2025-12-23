import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { getBookingTypeRecommendation, isEmergencyBookingTimeWindow } from '@/utils/bookingValidation';

interface BookingTypeSelectorProps {
  desiredDate: Date;
  onSelectType: (type: 'regular' | 'emergency') => void;
  className?: string;
}

export const BookingTypeSelector: React.FC<BookingTypeSelectorProps> = ({
  desiredDate,
  onSelectType,
  className = ""
}) => {
  const recommendation = getBookingTypeRecommendation(desiredDate);
  const isEmergencyWindow = isEmergencyBookingTimeWindow();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-fuchsia-900 mb-2">
          Choose Your Booking Type
        </h3>
        <p className="text-sm text-fuchsia-700">
          Based on your selected date: {desiredDate.toDateString()}
        </p>
      </div>

      {/* Recommendation Alert */}
      <Alert className={`border-2 ${
        recommendation.recommended === 'regular' ? 'border-green-200 bg-green-50' :
        recommendation.recommended === 'emergency' ? 'border-orange-200 bg-orange-50' :
        'border-red-200 bg-red-50'
      }`}>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommendation:</strong> {recommendation.reason}
          {recommendation.alternatives && (
            <ul className="mt-2 text-sm space-y-1">
              {recommendation.alternatives.map((alt, idx) => (
                <li key={idx}>• {alt}</li>
              ))}
            </ul>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Regular Booking Card */}
        <Card className={`border-2 transition-all hover:shadow-lg ${
          recommendation.recommended === 'regular' 
            ? 'border-green-400 ring-2 ring-green-200' 
            : 'border-gray-200'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Regular Booking</CardTitle>
              <Badge variant="secondary">24h+ Notice</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Minimum 24 hours advance notice</span>
              </div>
              <div>• Standard rates apply</div>
              <div>• Full nanny selection available</div>
              <div>• No time window restrictions</div>
            </div>
            
            <Button 
              onClick={() => onSelectType('regular')}
              disabled={recommendation.recommended === 'none'}
              className="w-full"
              variant={recommendation.recommended === 'regular' ? 'default' : 'outline'}
            >
              {recommendation.recommended === 'regular' ? 'Recommended' : 'Choose Regular'}
            </Button>
          </CardContent>
        </Card>

        {/* Emergency Booking Card */}
        <Card className={`border-2 transition-all hover:shadow-lg ${
          recommendation.recommended === 'emergency' 
            ? 'border-orange-400 ring-2 ring-orange-200' 
            : isEmergencyWindow 
              ? 'border-orange-200' 
              : 'border-gray-300 opacity-60'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Emergency Booking</CardTitle>
              <Badge variant={isEmergencyWindow ? "destructive" : "secondary"}>
                Same Day
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Available 24/7</span>
              </div>
              <div>• Premium rate: R80/hour</div>
              <div>• 2-hour arrival time</div>
              <div>• Minimum 5-hour booking</div>
              <div>• Same-day service only</div>
            </div>
            
            <Button 
              onClick={() => onSelectType('emergency')}
              disabled={recommendation.recommended === 'none'}
              className="w-full"
              variant={recommendation.recommended === 'emergency' ? 'default' : 'outline'}
            >
              {recommendation.recommended === 'emergency' ? 'Available Now' : 'Choose Emergency'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Status Information */}
      <div className="text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Emergency bookings available 24/7</span>
        </div>
      </div>
    </div>
  );
};
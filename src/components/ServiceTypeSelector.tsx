import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { 
  getRecommendedServiceType, 
  getServiceTypeLimits, 
  validateBookingDuration 
} from '@/utils/bookingValidation';

interface ServiceTypeSelectorProps {
  startDate: Date;
  endDate: Date;
  onSelectService: (type: 'short_term' | 'long_term') => void;
  className?: string;
}

export const ServiceTypeSelector: React.FC<ServiceTypeSelectorProps> = ({
  startDate,
  endDate,
  onSelectService,
  className = ""
}) => {
  const durationInDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const recommendedType = getRecommendedServiceType(durationInDays);
  const limits = getServiceTypeLimits();
  
  // Create dummy preferences for validation
  const dummyPreferences = {
    location: '',
    childrenAges: [],
    specialNeeds: false,
    ecdTraining: false,
    montessoriExperience: false,
    previousFamilies: false,
    cooking: false,
    drivingSupport: false,
    lightHousekeeping: false,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    durationType: durationInDays >= 30 ? 'long_term' : 'short_term'
  } as any;
  
  // Validate both service types
  const shortTermValidation = validateBookingDuration(dummyPreferences, 'short_term');
  const longTermValidation = validateBookingDuration(dummyPreferences, 'long_term');

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">
          Choose Your Service Type
        </h3>
        <p className="text-sm text-purple-700">
          Duration: {durationInDays} days ({startDate.toLocaleDateString()} - {endDate.toLocaleDateString()})
        </p>
      </div>

      {/* Recommendation Alert */}
      <Alert className="border-2 border-blue-200 bg-blue-50">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommendation:</strong> {recommendedType === 'short_term' ? 'Short-term' : 'Long-term'} service 
          is best suited for {durationInDays}-day bookings.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Short-term Service Card */}
        <Card className={`border-2 transition-all hover:shadow-lg ${
          recommendedType === 'short_term' 
            ? 'border-green-400 ring-2 ring-green-200' 
            : shortTermValidation.isValid 
              ? 'border-gray-200' 
              : 'border-red-200 opacity-60'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Short-term Service</CardTitle>
              <Badge variant={recommendedType === 'short_term' ? "default" : "secondary"}>
                1-{limits.short_term.maxDays} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{limits.short_term.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Flexible daily/hourly rates</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>No long-term commitment</span>
              </div>
            </div>

            {/* Validation Messages */}
            {shortTermValidation.warnings && shortTermValidation.warnings.length > 0 && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {shortTermValidation.warnings[0]}
              </div>
            )}

            {!shortTermValidation.isValid && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {shortTermValidation.errors.length > 0 ? shortTermValidation.errors[0] : 'Validation failed'}
              </div>
            )}
            
            <Button 
              onClick={() => onSelectService('short_term')}
              disabled={!shortTermValidation.isValid}
              className="w-full"
              variant={recommendedType === 'short_term' ? 'default' : 'outline'}
            >
              {recommendedType === 'short_term' ? 'Recommended' : 
               shortTermValidation.isValid ? 'Choose Short-term' : 'Not Available'}
            </Button>
          </CardContent>
        </Card>

        {/* Long-term Service Card */}
        <Card className={`border-2 transition-all hover:shadow-lg ${
          recommendedType === 'long_term' 
            ? 'border-green-400 ring-2 ring-green-200' 
            : longTermValidation.isValid 
              ? 'border-gray-200' 
              : 'border-red-200 opacity-60'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Long-term Service</CardTitle>
              <Badge variant={recommendedType === 'long_term' ? "default" : "secondary"}>
                {limits.long_term.minDays}-{limits.long_term.maxDays} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{limits.long_term.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Monthly rates + R2,500 placement fee</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Extended commitment</span>
              </div>
            </div>

            {/* Validation Messages */}
            {longTermValidation.warnings && longTermValidation.warnings.length > 0 && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {longTermValidation.warnings[0]}
              </div>
            )}

            {!longTermValidation.isValid && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {longTermValidation.errors.length > 0 ? longTermValidation.errors[0] : 'Validation failed'}
              </div>
            )}
            
            <Button 
              onClick={() => onSelectService('long_term')}
              disabled={!longTermValidation.isValid}
              className="w-full"
              variant={recommendedType === 'long_term' ? 'default' : 'outline'}
            >
              {recommendedType === 'long_term' ? 'Recommended' : 
               longTermValidation.isValid ? 'Choose Long-term' : 'Not Available'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Duration Summary */}
      <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded border">
        <div className="font-medium mb-1">Booking Duration Limits:</div>
        <div className="flex justify-center gap-6">
          <span>Short-term: Up to {limits.short_term.maxDays} days</span>
          <span>•</span>
          <span>Long-term: {limits.long_term.minDays}+ days</span>
        </div>
      </div>
    </div>
  );
};
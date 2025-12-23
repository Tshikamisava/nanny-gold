import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BookingRevenueDisplayProps {
  bookingType: 'short_term' | 'long_term' | 'emergency';
  totalCost: number;
  baseRate?: number;
  additionalServices?: number;
  placementFee?: number;
  commissionPercent?: number;
  commissionAmount?: number;
  nannyEarnings?: number;
  adminRevenue?: number;
  homeSize?: string;
  userRole: 'client' | 'nanny' | 'admin';
}

/**
 * Transparent Revenue Display Component
 * Shows clear breakdown of costs for clients, earnings for nannies, and revenue for admins
 */
export const BookingRevenueDisplay: React.FC<BookingRevenueDisplayProps> = ({
  bookingType,
  totalCost,
  baseRate = 0,
  additionalServices = 0,
  placementFee = 0,
  commissionPercent = 0,
  commissionAmount = 0,
  nannyEarnings = 0,
  adminRevenue = 0,
  homeSize,
  userRole
}) => {
  
  // Calculate missing values if not provided
  // Determine commission rate based on booking type and home size
  let effectiveCommissionPercent = commissionPercent;
  if (!effectiveCommissionPercent || effectiveCommissionPercent === 0) {
    if (bookingType === 'long_term') {
      // Updated commission tiers based on monthly rate
      if (baseRate >= 10000) {
        effectiveCommissionPercent = 30; // Premium tier: 30%
      } else if (baseRate <= 5000) {
        effectiveCommissionPercent = 5;  // Budget tier: 5%
      } else {
        effectiveCommissionPercent = 20; // Standard tier: 20%
      }
    } else {
      effectiveCommissionPercent = 20; // Short-term default
    }
  }

  // Calculate placement fee if not provided
  let effectivePlacementFee = placementFee || 0;
  if ((!effectivePlacementFee || effectivePlacementFee === 0) && bookingType === 'long_term') {
    const homeSizeLower = homeSize?.toLowerCase().replace(/[- ]/g, '_') || '';
    // Updated placement fee logic
    if (['grand_estate', 'monumental_manor', 'epic_estates'].includes(homeSizeLower)) {
      effectivePlacementFee = Math.round(baseRate * 0.5); // 50% of monthly rate for premium homes
    } else {
      effectivePlacementFee = 2500; // R2,500 for standard homes (Pocket Palace, Family Hub)
    }
  } else if ((!effectivePlacementFee || effectivePlacementFee === 0) && bookingType !== 'long_term') {
    effectivePlacementFee = 35; // R35 service fee for short-term (waived for gap coverage)
  }

  const calculatedCommission = commissionAmount || (baseRate * effectiveCommissionPercent / 100);
  const calculatedNannyEarnings = nannyEarnings || (baseRate + additionalServices - calculatedCommission);
  const calculatedAdminRevenue = adminRevenue || (effectivePlacementFee + calculatedCommission);

  const getCommissionTierInfo = () => {
    if (bookingType !== 'long_term') return 'Flat 20% commission';
    
    // Updated commission tiers based on monthly rate
    if (baseRate >= 10000) {
      return 'Premium Tier: 30% commission (R10,000+)';
    } else if (baseRate <= 5000) {
      return 'Budget Tier: 5% commission (≤R5,000)';
    } else {
      return 'Standard Tier: 20% commission (R5,001-R9,999)';
    }
  };

  const getPlacementFeeInfo = () => {
    if (bookingType !== 'long_term') return null;
    
    const homeSizeLower = homeSize?.toLowerCase().replace(/[- ]/g, '_') || '';
    if (['grand_estate', 'monumental_manor', 'epic_estates'].includes(homeSizeLower)) {
      return '50% of monthly rate (Premium homes: Grand Estate, Monumental Manor, Epic Estates)';
    }
    return 'Fixed R2,500 (Standard homes: Pocket Palace, Family Hub)';
  };

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-fuchsia-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revenue Breakdown
          </CardTitle>
          <Badge variant={bookingType === 'long_term' ? 'default' : 'secondary'}>
            {bookingType === 'long_term' ? 'Long-term' : bookingType === 'emergency' ? 'Emergency' : 'Short-term'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-6">
        
        {/* CLIENT VIEW */}
        {userRole === 'client' && (
          <>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Your Total Cost
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Complete breakdown of all costs for this booking</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              
              {bookingType === 'long_term' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Rate:</span>
                    <span className="font-medium">R{baseRate.toFixed(2)}</span>
                  </div>
                  
                  {additionalServices > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Additional Services:</span>
                      <span className="font-medium">R{additionalServices.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {effectivePlacementFee > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span className="flex items-center gap-1">
                        One-time Placement Fee
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{getPlacementFeeInfo()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <span className="font-medium">R{effectivePlacementFee.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Monthly Total:</span>
                    <span className="text-primary">R{(baseRate + additionalServices).toFixed(2)}</span>
                  </div>
                  
                  {effectivePlacementFee > 0 && (
                    <div className="flex justify-between font-bold text-sm text-blue-600">
                      <span>First Month Total (incl. placement fee):</span>
                      <span>R{(baseRate + additionalServices + effectivePlacementFee).toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              
              {bookingType !== 'long_term' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Total Booking Cost:</span>
                    <span className="font-medium">R{totalCost.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Amount Due:</span>
                    <span className="text-primary">R{totalCost.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-900">
              <p className="font-medium mb-1">💡 Payment Transparency:</p>
              <p>• Nanny receives {100 - effectiveCommissionPercent}% of the base rate</p>
              <p>• Platform commission: {effectiveCommissionPercent}% to maintain quality service</p>
              {additionalServices > 0 && <p>• 100% of additional services go directly to the nanny</p>}
            </div>
          </>
        )}

        {/* NANNY VIEW */}
        {userRole === 'nanny' && (
          <>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-green-600">
                <TrendingUp className="w-5 h-5" />
                Your Earnings
              </h3>
              
              {bookingType === 'long_term' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Base Rate:</span>
                    <span className="font-medium">R{baseRate.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Platform Commission ({effectiveCommissionPercent}%)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{getCommissionTierInfo()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span>-R{calculatedCommission.toFixed(2)}</span>
                  </div>
                  
                  {additionalServices > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Additional Services (100%):</span>
                      <span className="font-medium">+R{additionalServices.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg text-green-600">
                    <span>Total Monthly Earnings:</span>
                    <span>R{calculatedNannyEarnings.toFixed(2)}</span>
                  </div>
                </>
              )}
              
              {bookingType !== 'long_term' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Booking Total:</span>
                    <span className="font-medium">R{totalCost.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform Commission ({effectiveCommissionPercent}%):</span>
                    <span>-R{calculatedCommission.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg text-green-600">
                    <span>Your Earnings:</span>
                    <span>R{calculatedNannyEarnings.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg text-xs text-green-900">
              <p className="font-medium mb-1">✨ Earnings Breakdown:</p>
              <p>• Base rate: {100 - effectiveCommissionPercent}% goes to you</p>
              <p>• Additional services: 100% goes to you</p>
              <p>• Commission supports: Background checks, insurance, marketing, support</p>
              {effectivePlacementFee > 0 && <p>• Placement fee: Paid by client, not deducted from your earnings</p>}
            </div>
          </>
        )}

        {/* ADMIN VIEW */}
        {userRole === 'admin' && (
          <>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-fuchsia-600">
                Platform Revenue
              </h3>
              
              {bookingType === 'long_term' && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly Rate</p>
                      <p className="font-bold">R{baseRate.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Additional Services</p>
                      <p className="font-bold">R{additionalServices.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {effectivePlacementFee > 0 && (
                    <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                      <span className="font-medium text-blue-900">One-time Placement Fee:</span>
                      <span className="font-bold text-blue-900">R{effectivePlacementFee.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm bg-fuchsia-50 p-2 rounded">
                    <span className="font-medium text-fuchsia-900">Monthly Commission ({effectiveCommissionPercent}%):</span>
                    <span className="font-bold text-fuchsia-900">R{calculatedCommission.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold text-lg text-fuchsia-600">
                      <span>Total Admin Revenue (First Month):</span>
                      <span>R{calculatedAdminRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Monthly Recurring Revenue:</span>
                      <span>R{calculatedCommission.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Nanny Earnings:</span>
                    <span>R{calculatedNannyEarnings.toFixed(2)}</span>
                  </div>
                </>
              )}
              
              {bookingType !== 'long_term' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Total Booking:</span>
                    <span className="font-medium">R{totalCost.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm bg-fuchsia-50 p-2 rounded">
                    <span className="font-medium text-fuchsia-900">Platform Commission ({effectiveCommissionPercent}%):</span>
                    <span className="font-bold text-fuchsia-900">R{calculatedCommission.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg text-fuchsia-600">
                    <span>Total Admin Revenue:</span>
                    <span>R{calculatedAdminRevenue.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Nanny Earnings:</span>
                    <span>R{calculatedNannyEarnings.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-fuchsia-50 p-3 rounded-lg text-xs text-fuchsia-900">
              <p className="font-medium mb-1">📊 Revenue Split:</p>
              <p>• {getCommissionTierInfo()}</p>
              {effectivePlacementFee > 0 && <p>• Placement fee: {getPlacementFeeInfo()}</p>}
              <p>• Nanny receives: {100 - effectiveCommissionPercent}% of base + 100% additional services</p>
            </div>
          </>
        )}
        
      </CardContent>
    </Card>
  );
};

export default BookingRevenueDisplay;

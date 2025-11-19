import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface RevenueBreakdownProps {
  bookingType: 'short_term' | 'long_term';
  totalAmount: number;
  bookingDays?: number;
  monthlyRateEstimate?: number;
  homeSize?: string;
}

const RevenueBreakdown: React.FC<RevenueBreakdownProps> = ({
  bookingType,
  totalAmount,
  bookingDays = 1,
  monthlyRateEstimate,
  homeSize
}) => {
  // Calculate revenue split based on the corrected database function logic
  const calculateRevenueSplit = () => {
    let fixedFee = 0;
    let commissionPercent = 0;
    let commissionAmount = 0;
    let adminTotalRevenue = 0;
    let nannyEarnings = 0;
    
    const monthlyRate = monthlyRateEstimate || totalAmount;

    if (bookingType === 'long_term') {
      // Placement fee calculation based on home size (using database enum values)
      if (homeSize && ['grand_estate', 'monumental_manor'].includes(homeSize.toLowerCase())) {
        // Premium homes: 50% of monthly rate as placement fee
        fixedFee = monthlyRate * 0.50;
      } else {
        // Standard homes (pocket_palace, family_hub): Fixed R2,500 placement fee
        fixedFee = 2500;
      }
      
      // Commission calculation on FULL monthly rate (sliding scale)
      if (monthlyRate >= 10000) {
        commissionPercent = 25; // Premium homes: 25%
      } else if (monthlyRate <= 5000) {
        commissionPercent = 10; // Budget homes: 10%
      } else {
        commissionPercent = 15; // Standard homes: 15%
      }
      
      // Commission is calculated on the full monthly rate
      commissionAmount = monthlyRate * (commissionPercent / 100);
      
      // Admin total revenue = placement fee + commission
      adminTotalRevenue = fixedFee + commissionAmount;
      
      // Nanny earnings = monthly rate minus commission (placement fee doesn't affect nanny)
      nannyEarnings = monthlyRate - commissionAmount;
      
    } else {
      // Short-term bookings: R35 per day of booking
      fixedFee = 35 * Math.max(bookingDays, 1);
      commissionPercent = 20; // Flat 20%
      
      // Commission on the total amount minus fixed fee
      commissionAmount = (totalAmount - fixedFee) * (commissionPercent / 100);
      adminTotalRevenue = fixedFee + commissionAmount;
      nannyEarnings = totalAmount - commissionAmount;
    }

    return {
      fixedFee,
      commissionPercent,
      commissionAmount,
      adminTotalRevenue,
      nannyEarnings,
      monthlyRate
    };
  };

  const breakdown = calculateRevenueSplit();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Revenue Breakdown
            <Badge variant={bookingType === 'long_term' ? 'default' : 'secondary'}>
              {bookingType === 'long_term' ? 'Long-term' : 'Short-term'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookingType === 'long_term' && (
            <>
              {/* Monthly Rate */}
              <div className="flex justify-between items-center">
                <span className="font-medium">Monthly Rate:</span>
                <span className="font-bold text-lg">R{breakdown.monthlyRate.toFixed(2)}</span>
              </div>
              
              <Separator />
              
              {/* One-time Placement Fee */}
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-600">One-time Placement Fee</h3>
                <div className="flex justify-between items-center text-sm">
                  <span>• Placement Fee ({homeSize && ['grand_estate', 'monumental_manor'].includes(homeSize.toLowerCase()) ? '50% of monthly rate' : 'Fixed fee'}):</span>
                  <span>R{breakdown.fixedFee.toFixed(2)}</span>
                </div>
                {homeSize && (
                  <div className="text-xs text-muted-foreground">
                    Home category: {homeSize}
                  </div>
                )}
              </div>
              
              <Separator />
            </>
          )}
          
          {/* Admin Revenue Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-primary">
              {bookingType === 'long_term' ? 'Monthly Admin Revenue' : 'Admin Revenue'}
            </h3>
            
            {bookingType === 'short_term' && (
              <div className="flex justify-between items-center text-sm">
                <span>• Service Fee ({bookingDays} day{bookingDays > 1 ? 's' : ''}):</span>
                <span>R{breakdown.fixedFee.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-sm">
              <span>• Commission ({breakdown.commissionPercent}% of R{breakdown.monthlyRate.toFixed(2)}):</span>
              <span>R{breakdown.commissionAmount.toFixed(2)}</span>
            </div>
            
            {bookingType === 'long_term' ? (
              <div className="flex justify-between items-center font-medium text-primary">
                <span>Monthly Admin Revenue:</span>
                <span>R{breakdown.commissionAmount.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center font-medium text-primary">
                <span>Total Admin Revenue:</span>
                <span>R{breakdown.adminTotalRevenue.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Nanny Earnings Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-green-600">
              {bookingType === 'long_term' ? 'Monthly Nanny Earnings' : 'Nanny Earnings'}
            </h3>
            
            <div className="flex justify-between items-center text-sm">
              <span>• {bookingType === 'long_term' ? 'Monthly rate minus commission' : 'Total amount minus commission'}:</span>
              <span>R{breakdown.nannyEarnings.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center font-medium text-green-600">
              <span>Total Nanny Earnings:</span>
              <span>R{breakdown.nannyEarnings.toFixed(2)}</span>
            </div>
          </div>
          
          {bookingType === 'long_term' && (
            <>
              <Separator />
              
              {/* Total Revenue Summary */}
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm font-medium mb-2">Total Admin Revenue Summary:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>One-time Placement Fee:</span>
                    <span>R{breakdown.fixedFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Commission:</span>
                    <span>R{breakdown.commissionAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-primary">
                    <span>Total Admin Revenue (First Month):</span>
                    <span>R{breakdown.adminTotalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {bookingType === 'long_term' && (
            <div className="text-xs text-muted-foreground mt-2">
              * Commission rate varies: 10% (≤R5,000), 15% (R5,001-R9,999), 25% (≥R10,000)
              <br />
              * Placement fee: R2,500 for Pocket Palace & Family Hub, 50% of monthly rate for Grand Estate & Monumental Manor
              <br />
              * Placement fee is paid once upfront, commission is monthly recurring
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueBreakdown;
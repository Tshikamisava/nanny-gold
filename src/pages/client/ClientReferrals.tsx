import { Copy, Gift, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserReferrals, useApplyRewards, useCopyReferralCode } from "@/hooks/useUserReferrals";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ClientReferrals = () => {
  const { data: referralData, isLoading } = useUserReferrals();
  const applyRewards = useApplyRewards();
  const copyReferralCode = useCopyReferralCode();
  const [redeemAmount, setRedeemAmount] = useState<string>("");

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Paid': return 'secondary';
      default: return 'outline';
    }
  };

  const handleApplyRewards = () => {
    const amount = parseFloat(redeemAmount);
    if (amount <= 0 || amount > (referralData?.availableBalance || 0)) {
      return;
    }
    applyRewards.mutate(amount);
    setRedeemAmount("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral & Rewards</h1>
        <p className="text-muted-foreground mt-2">
          Share your referral code and earn 20% rewards on placement fees from successful referrals.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralData?.referrals.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{referralData?.totalEarned.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R{referralData?.availableBalance.toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            Share this code with friends and family. You'll earn 20% of the placement fee when they book long-term services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralData?.referralCode ? (
            <div className="flex items-center gap-2">
              <code className="bg-muted px-3 py-2 rounded-md font-mono text-sm flex-1">
                {referralData.referralCode}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyReferralCode(referralData.referralCode!)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No active referral code found. Contact support to get your referral code.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Apply Rewards Section */}
      {referralData?.availableBalance && referralData.availableBalance > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Apply Rewards</CardTitle>
            <CardDescription>
              Use your earned rewards to pay for future bookings or monthly service costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="redeem-amount">Amount to Apply (R)</Label>
                <Input
                  id="redeem-amount"
                  type="number"
                  placeholder="0.00"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  max={referralData.availableBalance}
                  min="0"
                  step="0.01"
                />
              </div>
              <Button 
                onClick={handleApplyRewards}
                disabled={
                  !redeemAmount || 
                  parseFloat(redeemAmount) <= 0 || 
                  parseFloat(redeemAmount) > referralData.availableBalance ||
                  applyRewards.isPending
                }
                className="mt-6"
              >
                {applyRewards.isPending ? "Applying..." : "Apply to Next Payment"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Available balance: R{referralData.availableBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>
            Track your referrals and reward earnings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralData?.referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referrals yet. Start sharing your code to earn rewards!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred Client</TableHead>
                  <TableHead>Placement Fee</TableHead>
                  <TableHead>Reward %</TableHead>
                  <TableHead>Reward Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralData?.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">{referral.referred_user_name}</TableCell>
                    <TableCell>R{referral.placement_fee.toFixed(2)}</TableCell>
                    <TableCell>{referral.reward_percentage}%</TableCell>
                    <TableCell className="font-semibold">R{referral.reward_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(referral.status)}>
                        {referral.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
import { Copy, Gift, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserReferrals, useCopyReferralCode } from "@/hooks/useUserReferrals";
import { Skeleton } from "@/components/ui/skeleton";

export const NannyReferrals = () => {
  const { data: referralData, isLoading } = useUserReferrals();
  const copyReferralCode = useCopyReferralCode();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Paid': return 'secondary';
      default: return 'outline';
    }
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
          Share your referral code and earn 10% rewards on placement fees from successful referrals.
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
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R{(referralData?.totalEarned - referralData?.totalRedeemed).toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            Share this code with potential clients. You'll earn 10% of the placement fee when they book long-term services.
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
                Your referral code is being generated. Please refresh the page in a moment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">1</div>
              <h4 className="font-semibold">Share Your Code</h4>
              <p className="text-sm text-muted-foreground">Give your referral code to potential clients</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">2</div>
              <h4 className="font-semibold">Client Books Service</h4>
              <p className="text-sm text-muted-foreground">They use your code when booking long-term care</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-bold">3</div>
              <h4 className="font-semibold">Earn Rewards</h4>
              <p className="text-sm text-muted-foreground">You receive 10% of the placement fee paid</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
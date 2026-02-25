import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGenerateNannyPaymentAdvice, useNanniesWithRewards } from '@/hooks/useRewardsInvoicing';
import { Plus } from 'lucide-react';

export const PaymentAdviceGenerationDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedNannyId, setSelectedNannyId] = useState<string>('');
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  
  const generateAdvice = useGenerateNannyPaymentAdvice();
  const { data: nannies, isLoading: loadingNannies } = useNanniesWithRewards();
  
  const selectedNanny = nannies?.find(n => n.id === selectedNannyId);
  const approvedRewards = Array.isArray(selectedNanny?.referral_participants) && 
    selectedNanny.referral_participants.length > 0 &&
    Array.isArray(selectedNanny.referral_participants[0].referral_logs)
    ? selectedNanny.referral_participants[0].referral_logs
        .filter((log: any) => log.status === 'Approved')
        .reduce((sum: number, log: any) => sum + (log.reward_amount || 0), 0)
    : 0;

  const totalAmount = (parseFloat(baseAmount) || 0) + approvedRewards;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedNannyId || !baseAmount || !periodStart || !periodEnd) return;

    generateAdvice.mutate({
      nanny_id: selectedNannyId,
      base_amount: parseFloat(baseAmount),
      period_start: periodStart,
      period_end: periodEnd
    }, {
      onSuccess: () => {
        setOpen(false);
        setSelectedNannyId('');
        setBaseAmount('');
        setPeriodStart('');
        setPeriodEnd('');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus className="w-4 h-4 mr-2" />
          Generate Payment Advice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Nanny Payment Advice</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nanny">Nanny</Label>
              <Select value={selectedNannyId} onValueChange={setSelectedNannyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select nanny" />
                </SelectTrigger>
                <SelectContent>
                  {loadingNannies ? (
                    <SelectItem value="" disabled>Loading...</SelectItem>
                  ) : (
                    nannies?.map((nanny) => (
                      <SelectItem key={nanny.id} value={nanny.id}>
                        {nanny.first_name} {nanny.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-amount">Base Salary (R)</Label>
              <Input
                id="base-amount"
                type="number"
                step="0.01"
                min="0"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">Period Start</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-end">Period End</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {selectedNanny && approvedRewards > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Referral Rewards</CardTitle>
                <CardDescription>
                  Approved rewards pending payment for this period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Available Referral Rewards:</span>
                  <Badge variant="secondary">R{approvedRewards.toFixed(2)}</Badge>
                </div>

                {baseAmount && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Base Salary:</span>
                      <span>R{parseFloat(baseAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Referral Rewards:</span>
                      <span>+R{approvedRewards.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Payout:</span>
                      <span>R{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedNannyId || !baseAmount || !periodStart || !periodEnd || generateAdvice.isPending}
            >
              {generateAdvice.isPending ? "Generating..." : "Generate Payment Advice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
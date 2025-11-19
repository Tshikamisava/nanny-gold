import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGenerateClientInvoice, useClientsWithRewards } from '@/hooks/useRewardsInvoicing';
import { Plus } from 'lucide-react';

export const InvoiceGenerationDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [baseAmount, setBaseAmount] = useState<string>('');
  const [description, setDescription] = useState('Service charges');
  const [applyRewards, setApplyRewards] = useState(false);
  
  const generateInvoice = useGenerateClientInvoice();
  const { data: clients, isLoading: loadingClients } = useClientsWithRewards();
  
  const selectedClient = clients?.find(c => c.id === selectedClientId);
  const availableBalance = Array.isArray(selectedClient?.reward_balances) && selectedClient.reward_balances.length > 0 
    ? selectedClient.reward_balances[0].available_balance 
    : 0;
  const rewardsToApply = applyRewards ? Math.min(availableBalance, parseFloat(baseAmount) || 0) : 0;
  const finalAmount = (parseFloat(baseAmount) || 0) - rewardsToApply;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId || !baseAmount) return;

    generateInvoice.mutate({
      client_id: selectedClientId,
      base_amount: parseFloat(baseAmount),
      apply_rewards: applyRewards,
      description
    });

    if (generateInvoice.isSuccess) {
      setOpen(false);
      setSelectedClientId('');
      setBaseAmount('');
      setDescription('Service charges');
      setApplyRewards(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Client Invoice</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {loadingClients ? (
                    <SelectItem value="" disabled>Loading...</SelectItem>
                  ) : (
                    clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Base Amount (R)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Service description"
            />
          </div>

          {selectedClient && availableBalance > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rewards Integration</CardTitle>
                <CardDescription>
                  Client has R{availableBalance.toFixed(2)} in available rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apply-rewards"
                    checked={applyRewards}
                    onCheckedChange={(checked) => setApplyRewards(checked as boolean)}
                  />
                  <Label htmlFor="apply-rewards">Apply available rewards to this invoice</Label>
                </div>

                {baseAmount && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Base Amount:</span>
                      <span>R{parseFloat(baseAmount).toFixed(2)}</span>
                    </div>
                    {applyRewards && rewardsToApply > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Rewards Credit:</span>
                        <span>-R{rewardsToApply.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Final Amount:</span>
                      <span>R{finalAmount.toFixed(2)}</span>
                    </div>
                    {applyRewards && rewardsToApply > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Remaining Rewards:</span>
                        <span>R{(availableBalance - rewardsToApply).toFixed(2)}</span>
                      </div>
                    )}
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
              disabled={!selectedClientId || !baseAmount || generateInvoice.isPending}
            >
              {generateInvoice.isPending ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
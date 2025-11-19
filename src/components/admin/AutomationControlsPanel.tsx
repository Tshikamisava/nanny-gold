import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, Lock, Unlock, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGenerateAllMissingInvoices } from '@/hooks/useBookingInvoices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface AutomationControlsPanelProps {
  missingInvoicesCount: number;
  totalOutstandingRevenue: number;
}

export const AutomationControlsPanel = ({
  missingInvoicesCount,
  totalOutstandingRevenue,
}: AutomationControlsPanelProps) => {
  const generateAllInvoices = useGenerateAllMissingInvoices();
  const { toast } = useToast();
  const [processingPayments, setProcessingPayments] = useState(false);

  const handleGenerateAllInvoices = () => {
    if (!confirm(
      `This will generate ${missingInvoicesCount} missing invoices totaling R${totalOutstandingRevenue.toFixed(2)}.\n\nContinue?`
    )) {
      return;
    }

    generateAllInvoices.mutate();
  };

  const handleProcessPayments = async (action: 'authorize' | 'capture') => {
    const actionLabel = action === 'authorize' ? 'authorization' : 'capture';
    if (!confirm(`This will ${actionLabel} all pending monthly payments. Continue?`)) {
      return;
    }

    setProcessingPayments(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-monthly-payments', {
        body: { action }
      });

      if (error) {
        console.error(`Payment ${action} error:`, error);
        throw new Error(error.message || `Failed to ${action} payments`);
      }

      console.log(`Payment ${action} result:`, data);

      const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
      toast({
        title: `Payment ${capitalizedAction} Complete`,
        description: `Processed: ${data?.summary?.processed || 0}, Successful: ${data?.summary?.successful || 0}, Errors: ${data?.summary?.errors || 0}`,
      });
    } catch (error: any) {
      console.error(`Payment ${action} error:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} payments`,
        variant: "destructive",
      });
    } finally {
      setProcessingPayments(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Automation Controls
        </CardTitle>
        <CardDescription>
          Bulk operations for invoice generation and payment processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingInvoicesCount > 0 && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>{missingInvoicesCount} bookings</strong> need invoices generated (R{totalOutstandingRevenue.toFixed(2)} outstanding revenue)
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <div className="font-semibold mb-1">Generate All Missing Invoices</div>
              <div className="text-sm text-muted-foreground">
                Creates invoices for all bookings without one (long-term & short-term)
              </div>
            </div>
            <Button
              onClick={handleGenerateAllInvoices}
              disabled={generateAllInvoices.isPending || missingInvoicesCount === 0}
              size="sm"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {generateAllInvoices.isPending ? 'Generating...' : `Generate ${missingInvoicesCount}`}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <div className="font-semibold mb-1">Process Authorization (25th)</div>
              <div className="text-sm text-muted-foreground">
                Pre-authorize payments for upcoming billing cycle
              </div>
            </div>
            <Button
              onClick={() => handleProcessPayments('authorize')}
              disabled={processingPayments}
              variant="outline"
              size="sm"
            >
              <Lock className="mr-2 h-4 w-4" />
              {processingPayments ? 'Processing...' : 'Authorize'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <div className="font-semibold mb-1">Process Capture (1st)</div>
              <div className="text-sm text-muted-foreground">
                Capture authorized payments on billing day
              </div>
            </div>
            <Button
              onClick={() => handleProcessPayments('capture')}
              disabled={processingPayments}
              size="sm"
            >
              <Unlock className="mr-2 h-4 w-4" />
              {processingPayments ? 'Processing...' : 'Capture'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

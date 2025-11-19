import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, CreditCard } from "lucide-react";

interface PaymentHistoryTimelineProps {
  invoices: any[];
}

export const PaymentHistoryTimeline = ({ invoices }: PaymentHistoryTimelineProps) => {
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.paid_date || b.created_at).getTime() - new Date(a.paid_date || a.created_at).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedInvoices.map((invoice, index) => (
            <div key={invoice.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`rounded-full p-2 ${
                  invoice.status === 'paid' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {invoice.status === 'paid' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                {index < sortedInvoices.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-200 my-2" />
                )}
              </div>
              
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold">{invoice.invoice_number}</div>
                  <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                    {invoice.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {invoice.paid_date 
                    ? `Paid on ${new Date(invoice.paid_date).toLocaleDateString('en-ZA')}`
                    : `Due ${new Date(invoice.due_date).toLocaleDateString('en-ZA')}`
                  }
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold">R{invoice.amount.toFixed(2)}</div>
                  {invoice.payment_method && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CreditCard className="h-3 w-3" />
                      {invoice.payment_method}
                    </div>
                  )}
                </div>
                {invoice.rewards_applied > 0 && (
                  <div className="text-xs text-primary mt-1">
                    Rewards applied: R{invoice.rewards_applied.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
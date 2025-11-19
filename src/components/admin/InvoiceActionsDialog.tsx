import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: string
  booking_id?: string | null
  client?: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
  }
  line_items?: Array<{ description: string; amount: number }>
}

interface InvoiceActionsDialogProps {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const InvoiceActionsDialog = ({ invoice, open, onOpenChange, onSuccess }: InvoiceActionsDialogProps) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('eft')
  const [loading, setLoading] = useState(false)

  const handleMarkAsPaid = async () => {
    if (!invoice) return

    if (!paymentReference.trim()) {
      toast.error('Payment reference is required')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.functions.invoke('mark-invoice-paid', {
        body: {
          invoice_id: invoice.id,
          payment_date: paymentDate,
          payment_reference: paymentReference,
          payment_method: paymentMethod
        }
      })

      if (error) throw error

      toast.success('Invoice marked as paid successfully', {
        description: `Invoice ${invoice.invoice_number} has been confirmed and the booking is now active.`
      })
      
      onSuccess()
      onOpenChange(false)
      
      // Reset form
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentReference('')
      setPaymentMethod('eft')
    } catch (error: any) {
      console.error('Error marking invoice as paid:', error)
      toast.error('Failed to mark invoice as paid', {
        description: error.message || 'Please try again or contact support.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!invoice) return null

  const clientName = invoice.client 
    ? `${invoice.client.first_name || ''} ${invoice.client.last_name || ''}`.trim() || 'Unknown Client'
    : 'Unknown Client'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark Invoice as Paid</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                <p className="font-medium">{invoice.invoice_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Client</Label>
                <p className="font-medium">{clientName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <p className="text-lg font-bold text-primary">R{invoice.amount.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Current Status</Label>
                <p className="font-medium capitalize">{invoice.status}</p>
              </div>
            </div>

            {invoice.line_items && invoice.line_items.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Line Items</Label>
                <div className="space-y-1">
                  {invoice.line_items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.description}</span>
                      <span className="font-medium">R{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Information Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="payment-reference">Payment Reference *</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Enter bank reference or transaction ID"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reference will be used for record-keeping and audit purposes
              </p>
            </div>

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eft">EFT / Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong> Marking this invoice as paid will:
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 ml-4 list-disc">
              <li>Update the booking status to "confirmed"</li>
              <li>Notify the client that payment was received</li>
              <li>Notify the nanny about the confirmed booking</li>
              <li>Update financial records and revenue calculations</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMarkAsPaid}
            disabled={loading || !paymentReference.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

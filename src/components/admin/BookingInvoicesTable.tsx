import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, AlertCircle, CheckCircle } from 'lucide-react';
import { BookingWithInvoice, useGenerateBookingInvoice } from '@/hooks/useBookingInvoices';
import { format } from 'date-fns';

interface BookingInvoicesTableProps {
  bookings: BookingWithInvoice[];
  loading?: boolean;
}

export const BookingInvoicesTable = ({ bookings, loading }: BookingInvoicesTableProps) => {
  const generateInvoice = useGenerateBookingInvoice();

  const getBookingTypeLabel = (type: string) => {
    switch (type) {
      case 'long_term':
        return 'Long-term';
      case 'short_term':
        return 'Short-term';
      case 'temporary_support':
        return 'Temporary Support';
      case 'emergency':
        return 'Emergency';
      default:
        return type;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return 'default';
      case 'pending':
        return 'outline';
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading bookings...</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Nanny</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Invoice Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              No bookings found
            </TableCell>
          </TableRow>
        ) : (
          bookings.map((booking) => {
            const hasInvoice = booking.invoices && booking.invoices.length > 0;
            /**
             * Note: booking_financials is returned as an array by Supabase (nested select behavior)
             * Access the first element for the one-to-one relationship
             */
            const revenue = booking.booking_financials?.[0]?.admin_total_revenue || 0;
            
            return (
              <TableRow key={booking.id}>
                <TableCell>
                  <div className="font-medium">
                    {booking.client
                      ? `${booking.client.first_name} ${booking.client.last_name}`
                      : 'Unknown Client'}
                  </div>
                  <div className="text-xs text-muted-foreground">{booking.client?.email}</div>
                </TableCell>
                <TableCell>
                  {booking.nanny
                    ? `${booking.nanny.first_name} ${booking.nanny.last_name}`
                    : 'Unknown Nanny'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getBookingTypeLabel(booking.booking_type)}</Badge>
                </TableCell>
                <TableCell>{format(new Date(booking.start_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">R{revenue.toFixed(2)}</TableCell>
                <TableCell>
                  {hasInvoice ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {booking.invoices![0].invoice_number}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Missing Invoice</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {!hasInvoice ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => generateInvoice.mutate(booking.id)}
                      disabled={generateInvoice.isPending}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Generated
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

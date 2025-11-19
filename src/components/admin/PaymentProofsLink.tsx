import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

const PaymentProofsLink = () => {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to="/admin/payment-proofs" className="flex items-center gap-2">
        <CreditCard className="w-4 h-4" />
        Payment Proofs
      </Link>
    </Button>
  );
};

export default PaymentProofsLink;
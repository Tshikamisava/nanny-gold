import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Download, 
  FileText,
  Search,
  CreditCard
} from 'lucide-react';
import { formatCurrency } from '@/utils/pricingUtils';

interface PaymentProof {
  id: string;
  client_id: string;
  booking_id?: string;
  invoice_id?: string;
  proof_file_url: string;
  amount: number;
  upload_date: string;
  verification_status: string;
  verified_at?: string;
  verified_by?: string;
  admin_notes?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const AdminPaymentProofs = () => {
  const { toast } = useToast();
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentProofs();
  }, []);

  const loadPaymentProofs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          profiles!payment_proofs_client_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setProofs((data as any) || []);
    } catch (error) {
      console.error('Error loading payment proofs:', error);
      toast({
        title: "Error",
        description: "Failed to load payment proofs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (proofId: string, status: 'approved' | 'rejected') => {
    try {
      setProcessing(proofId);
      
      const { error } = await supabase
        .from('payment_proofs')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          admin_notes: adminNotes
        })
        .eq('id', proofId);

      if (error) throw error;

      // If approved, update related booking status
      if (status === 'approved') {
        const proof = proofs.find(p => p.id === proofId);
        if (proof?.booking_id) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', proof.booking_id);
        }
      }

      toast({
        title: "Success",
        description: `Payment ${status} successfully`,
      });

      setSelectedProof(null);
      setAdminNotes('');
      await loadPaymentProofs();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: "Failed to verify payment",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredProofs = proofs.filter(proof =>
    proof.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proof.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proof.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proof.verification_status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Proofs</h1>
          <p className="text-muted-foreground">
            Review and verify client payment confirmations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by client name, email, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Payment Proofs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Proofs ({filteredProofs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProofs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No payment proofs found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Payment proofs will appear here when clients upload them'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredProofs.map((proof) => (
                  <div key={proof.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">
                            {proof.profiles?.first_name} {proof.profiles?.last_name}
                          </h3>
                          <Badge className={`${getStatusColor(proof.verification_status)} border flex items-center gap-1`}>
                            {getStatusIcon(proof.verification_status)}
                            {proof.verification_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {proof.profiles?.email}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-foreground">
                            {formatCurrency(proof.amount)}
                          </span>
                          <span className="text-muted-foreground">
                            Uploaded: {new Date(proof.upload_date).toLocaleDateString()}
                          </span>
                          {proof.verified_at && (
                            <span className="text-muted-foreground">
                              Verified: {new Date(proof.verified_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(proof.proof_file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Proof
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProof(proof);
                                setAdminNotes(proof.admin_notes || '');
                              }}
                              disabled={proof.verification_status !== 'pending'}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Verify
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Verify Payment Proof</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Client</p>
                                <p className="font-medium">
                                  {selectedProof?.profiles?.first_name} {selectedProof?.profiles?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedProof?.profiles?.email}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Amount</p>
                                <p className="font-medium text-lg">
                                  {selectedProof && formatCurrency(selectedProof.amount)}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="admin-notes">Admin Notes</Label>
                                <Textarea
                                  id="admin-notes"
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes about this payment verification..."
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => selectedProof && handleVerifyPayment(selectedProof.id, 'rejected')}
                                  disabled={processing === selectedProof?.id}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  onClick={() => selectedProof && handleVerifyPayment(selectedProof.id, 'approved')}
                                  disabled={processing === selectedProof?.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    {proof.admin_notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <p className="font-medium text-muted-foreground mb-1">Admin Notes:</p>
                        <p>{proof.admin_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentProofs;
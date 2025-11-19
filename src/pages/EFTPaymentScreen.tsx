import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { useBooking } from "@/contexts/BookingContext";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Upload, Copy, CheckCircle, Mail, CreditCard, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/pricingUtils";
import { unifiedPricingCalculator } from "@/utils/unifiedPricingCalculator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EFTPaymentScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedNanny, preferences } = useBooking();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Get data from navigation state
  const bookingId = location.state?.bookingId;
  const pricingData = location.state?.pricingData;
  const nannyName = location.state?.nannyName || 'Selected Nanny';
  const bookingType = location.state?.bookingType || 'long_term';
  const invoiceId = location.state?.invoiceId;
  const invoiceNumber = location.state?.invoiceNumber;
  const amount = location.state?.amount;

  // Redirect if no booking ID or invoice ID
  useEffect(() => {
    if (!bookingId && !invoiceId) {
      toast({
        title: "Error",
        description: "No booking or invoice found. Please start over.",
        variant: "destructive"
      });
      navigate('/client/invoices');
    }
  }, [bookingId, invoiceId, navigate, toast]);

  // Bank details for EFT payments
  const bankDetails = {
    accountName: "NannyGold (Pty) Ltd",
    accountNumber: "1054131465",
    accountType: "Current",
    bank: "Capitec Business",
    branchCode: "450105"
  };

  const selectedNannyName = nannyName;
  
  // Calculate total amount with comprehensive fallback chain
  const totalAmount = (() => {
    const finalAmount = amount || pricingData?.total || pricingData?.placementFee || 0;
    console.log('💰 EFT Total Amount Calculation:', {
      passedAmount: amount,
      pricingDataTotal: pricingData?.total,
      pricingDataPlacementFee: pricingData?.placementFee,
      finalAmount
    });
    return finalAmount;
  })();
  
  const reference = invoiceNumber || user?.email || 'NANNY-' + Date.now();

  // Warning if amount is R0
  useEffect(() => {
    if (totalAmount === 0) {
      console.error('⚠️ WARNING: EFT payment amount is R0!', {
        bookingId,
        invoiceId,
        amount,
        bookingType,
        pricingData
      });
    }
  }, [totalAmount, bookingId, invoiceId, amount, bookingType, pricingData]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the details manually",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, or PDF file",
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setProofFile(file);
    }
  };

  const uploadProofOfPayment = async () => {
    if (!proofFile || !user) {
      toast({
        title: "Missing information",
        description: "Please select a proof of payment file",
        variant: "destructive"
      });
      return;
    }

    if (!bookingId) {
      toast({
        title: "Error",
        description: "No booking ID found. Please start over.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file to Supabase storage
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${user.id}/proof-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofFile);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', fileName);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Get current session to ensure we have valid auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      console.log('Calling process-eft-booking function...');

      // Process booking with proof using the real booking ID or invoice ID
      const { data: functionData, error: eftError } = await supabase.functions.invoke('process-eft-booking', {
        body: {
          bookingId: bookingId,
          invoiceId: invoiceId,
          paymentReference: reference,
          proofOfPaymentUrl: publicUrl
        }
      });
      
      // PHASE 3: Enhanced error handling with user-friendly feedback
      if (eftError) {
        console.error('❌ Edge function error:', eftError);
        
        // Enhanced fallback: Update booking status AND show user-friendly error
        console.log('🔄 Attempting fallback update...');
        const { error: fallbackError } = await supabase
          .from('bookings')
          .update({
            status: 'pending',
            notes: `EFT Payment - Ref: ${reference}. Proof uploaded: ${publicUrl}. Awaiting admin verification.`
          })
          .eq('id', bookingId);
        
        if (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          // Show user the actual error with reference for support
          throw new Error(`Payment proof uploaded but booking update failed. Please contact support with reference: ${reference}`);
        }
        
        console.log('✅ Fallback update successful - booking marked as pending');
        
        // Show success message even though edge function failed (fallback worked)
        toast({
          title: "Payment Proof Uploaded",
          description: "Your payment has been submitted for verification. We'll update you within 2 hours.",
        });
      } else {
        console.log('✅ Edge function response:', functionData);
        
        // Show success toast for normal flow
        toast({
          title: "Payment Submitted Successfully",
          description: "Your EFT payment proof has been uploaded and is being processed.",
        });
      }


      // Navigate based on context
      if (invoiceId) {
        toast({
          title: "Success!",
          description: "Your proof of payment has been uploaded. We'll process it shortly.",
        });
        navigate('/client/invoices');
      } else {
        navigate('/booking-confirmation', { 
          state: { 
            bookingId: bookingId,
            paymentMethod: 'eft',
            amount: totalAmount,
            nannyName: selectedNannyName,
            reference: reference,
            paymentStatus: 'pending_verification'
          }
        });
      }

    } catch (error: any) {
      console.error('Error uploading proof:', error);
      const errorMessage = error?.message || 'Failed to upload proof of payment. Please try again.';
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-primary hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
            <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
            <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
            <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
          </div>
          <div className="w-10 h-10"></div> {/* Spacer */}
        </div>

        {/* Return to Invoices button for invoice payments */}
        {invoiceId && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/client/invoices')}
          >
            Return to Invoices
          </Button>
        )}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            EFT Payment Details
          </h1>
          <p className="text-muted-foreground">
            Transfer payment to complete booking with {selectedNannyName}
          </p>
        </div>

        {/* Payment Amount */}
        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader className="bg-primary/5 rounded-t-xl border-b border-border">
            <CardTitle className="text-primary flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-2">
                {formatCurrency(totalAmount)}
              </div>
              <div className="text-sm text-muted-foreground">
                {preferences.durationType === 'long_term' ? 'Placement Fee (Initial Payment)' : 'Total Fee'}
              </div>
              
              {preferences.durationType === 'long_term' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    This is the initial placement fee to secure your booking. Monthly service charges will begin once your nanny starts work.
                  </p>
                </div>
              )}
              
              {/* Show service breakdown only for short-term bookings */}
              {preferences.durationType !== 'long_term' && pricingData && (
                <div className="mt-4 space-y-2 text-left">
                  <div className="text-sm font-medium text-foreground mb-2">Service Breakdown:</div>
                  <div className="flex justify-between text-sm">
                    <span>Base Rate</span>
                    <span>{formatCurrency(pricingData.baseRate)}</span>
                  </div>
                  {pricingData.addOns && pricingData.addOns.length > 0 && pricingData.addOns.map((addon: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>+{addon.name}</span>
                      <span>{addon.price === 0 ? 'Free' : formatCurrency(addon.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader className="bg-green-50 dark:bg-green-950/20 rounded-t-xl border-b border-border">
            <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Bank Transfer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Account Name</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{bankDetails.accountName}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(bankDetails.accountName, "Account Name")}
                    className="h-6 w-6 p-0"
                  >
                    {copied === "Account Name" ? 
                      <CheckCircle className="w-3 h-3 text-green-600" /> : 
                      <Copy className="w-3 h-3" />
                    }
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground font-mono">{bankDetails.accountNumber}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(bankDetails.accountNumber, "Account Number")}
                    className="h-6 w-6 p-0"
                  >
                    {copied === "Account Number" ? 
                      <CheckCircle className="w-3 h-3 text-green-600" /> : 
                      <Copy className="w-3 h-3" />
                    }
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bank</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{bankDetails.bank}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(bankDetails.bank, "Bank")}
                    className="h-6 w-6 p-0"
                  >
                    {copied === "Bank" ? 
                      <CheckCircle className="w-3 h-3 text-green-600" /> : 
                      <Copy className="w-3 h-3" />
                    }
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Branch Code</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground font-mono">{bankDetails.branchCode}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(bankDetails.branchCode, "Branch Code")}
                    className="h-6 w-6 p-0"
                  >
                    {copied === "Branch Code" ? 
                      <CheckCircle className="w-3 h-3 text-green-600" /> : 
                      <Copy className="w-3 h-3" />
                    }
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reference</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">{reference}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(reference, "Reference")}
                    className="h-6 w-6 p-0"
                  >
                    {copied === "Reference" ? 
                      <CheckCircle className="w-3 h-3 text-green-600" /> : 
                      <Copy className="w-3 h-3" />
                    }
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Important:</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Please use your email address <strong>({reference})</strong> as the payment reference to ensure quick processing.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proof of Payment Upload */}
        <Card className="rounded-xl royal-shadow border-border">
          <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl border-b border-border">
            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Proof of Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proof-upload" className="text-sm font-medium">
                Select file (JPG, PNG, or PDF, max 5MB)
              </Label>
              <Input
                id="proof-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>

            {proofFile && (
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    File selected: {proofFile.name}
                  </span>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                After making the transfer, upload your proof of payment here. 
                We'll verify and confirm your booking within 2 hours.
              </p>
              
              <p className="text-xs text-muted-foreground">
                Questions? Email us at <strong>payments@nannygold.com</strong>
              </p>
            </div>

            <Button 
              onClick={uploadProofOfPayment}
              disabled={!proofFile || uploading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Proof & Complete Booking
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EFTPaymentScreen;
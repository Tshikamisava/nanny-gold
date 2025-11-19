import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, Calendar } from "lucide-react";

interface PlacementFeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  children?: React.ReactNode;
}

export const PlacementFeeDialog = ({ isOpen, onOpenChange, onAccept, children }: PlacementFeeDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Long-Term Placement Service
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Our comprehensive placement guarantee for your peace of mind
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-foreground">90-Day Guarantee</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              If you're not satisfied with your nanny for any reason, we'll replace them within 90 days at no additional cost.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Free nanny replacements</p>
                <p className="text-xs text-muted-foreground">Change nannies as many times as needed within 90 days</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Re-matching service</p>
                <p className="text-xs text-muted-foreground">We'll find new candidates that better match your needs</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Quality assurance</p>
                <p className="text-xs text-muted-foreground">All replacement nannies are pre-screened and verified</p>
              </div>
            </div>
          </div>
          
          <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">One-time placement fee</p>
                <p className="text-sm text-muted-foreground">Covers initial placement + 90-day guarantee</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-secondary">R2,500</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 royal-gradient text-white" 
              onClick={onAccept}
            >
              Accept & Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
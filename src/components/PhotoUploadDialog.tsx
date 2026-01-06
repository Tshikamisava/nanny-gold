import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, CheckCircle, XCircle, Loader2, Smile, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoUploaded: (url: string) => void;
  currentPhotoUrl?: string;
  targetUserId?: string; // For admin context - which user's photo to manage
}

export default function PhotoUploadDialog({ 
  open, 
  onOpenChange, 
  onPhotoUploaded, 
  currentPhotoUrl,
  targetUserId
}: PhotoUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    hasHeadShoulders: boolean | null;
    hasSmile: boolean | null;
    isValidSize: boolean | null;
  }>({
    hasHeadShoulders: null,
    hasSmile: null,
    isValidSize: null
  });
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Start validation
    await validateImage(file);
  };

  const validateImage = async (file: File) => {
    setValidating(true);
    setValidationResults({
      hasHeadShoulders: null,
      hasSmile: null,
      isValidSize: null
    });

    try {
      // Basic size validation
      const img = new Image();
      img.onload = () => {
        const isValidSize = img.width >= 400 && img.height >= 400;
        setValidationResults(prev => ({
          ...prev,
          isValidSize
        }));

        // Simulate AI validation for demo purposes
        // In a real implementation, you would use actual AI models
        setTimeout(() => {
          // Mock validation - in reality this would use computer vision
          const hasHeadShoulders = Math.random() > 0.3; // 70% chance of passing
          const hasSmile = Math.random() > 0.4; // 60% chance of passing
          
          setValidationResults(prev => ({
            ...prev,
            hasHeadShoulders,
            hasSmile
          }));
          setValidating(false);
        }, 2000);
      };
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error validating image:', error);
      setValidating(false);
      toast({
        title: "Validation error",
        description: "Could not validate image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const { hasHeadShoulders, hasSmile, isValidSize } = validationResults;
    
    if (!hasHeadShoulders || !hasSmile || !isValidSize) {
      toast({
        title: "Photo requirements not met",
        description: "Please ensure your photo meets all the requirements before uploading.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Use targetUserId for admin context, otherwise use current user
      const userId = targetUserId || user.user.id;

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}-profile.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onPhotoUploaded(publicUrl);
      onOpenChange(false);
      toast({
        title: "Photo uploaded successfully",
        description: "Your profile photo has been updated!"
      });

      // Cleanup
      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationResults({
        hasHeadShoulders: null,
        hasSmile: null,
        isValidSize: null
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const ValidationIcon = ({ result }: { result: boolean | null }) => {
    if (result === null) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    return result ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  const allValidationsPassed = Object.values(validationResults).every(result => result === true);
  const validationInProgress = validating || Object.values(validationResults).some(result => result === null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Upload Profile Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Requirements */}
          <Alert>
            <Smile className="w-4 h-4" />
            <AlertDescription>
              <strong>Photo Requirements:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Head and shoulders clearly visible</li>
                <li>• Smiling and friendly expression</li>
                <li>• Minimum 400x400 pixels</li>
                <li>• Maximum 5MB file size</li>
                <li>• Good lighting and clear image</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="space-y-4">
            <Label htmlFor="photo-upload">Select Photo</Label>
            <input
              ref={fileInputRef}
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Photo
            </Button>
          </div>

          {/* Preview and Validation */}
          {previewUrl && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Validation Results */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm">Photo Validation</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Head & shoulders visible</span>
                    </div>
                    <ValidationIcon result={validationResults.hasHeadShoulders} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smile className="w-4 h-4" />
                      <span className="text-sm">Smiling expression</span>
                    </div>
                    <ValidationIcon result={validationResults.hasSmile} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm">Image quality (400x400+)</span>
                    </div>
                    <ValidationIcon result={validationResults.isValidSize} />
                  </div>
                </div>

                {!validationInProgress && !allValidationsPassed && (
                  <Alert className="mt-3">
                    <AlertDescription className="text-sm">
                      <strong>Photo Tips:</strong>
                      {!validationResults.hasHeadShoulders && <span className="block">• Frame yourself from head to shoulders</span>}
                      {!validationResults.hasSmile && <span className="block">• Show a genuine, friendly smile</span>}
                      {!validationResults.isValidSize && <span className="block">• Use a higher resolution image</span>}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !allValidationsPassed || validationInProgress || uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
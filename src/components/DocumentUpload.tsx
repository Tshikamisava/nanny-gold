import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, Mail, X, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadedDocument {
  id: string;
  name: string;
  type: 'id_document' | 'criminal_check' | 'reference_letter' | 'certification';
  status: 'pending' | 'approved' | 'rejected';
  uploadDate: string;
  extractedTitle?: string;
}

interface DocumentUploadProps {
  hideEmailSupport?: boolean;
  targetUserId?: string; // For admin context - which user's documents to manage
  isAdminView?: boolean; // Enable admin document management features
}

export default function DocumentUpload({ hideEmailSupport = false, targetUserId, isAdminView = false }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing documents on mount and when targetUserId changes
  useEffect(() => {
    loadExistingDocuments();
  }, [targetUserId]);

  const loadExistingDocuments = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Use targetUserId for admin context, otherwise use current user
      const userId = targetUserId || user.user.id;

      const { data, error } = await supabase
        .from('nanny_documents')
        .select('*')
        .eq('nanny_id', userId)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      const mappedDocs: UploadedDocument[] = data.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        type: doc.document_type as 'id_document' | 'criminal_check' | 'reference_letter' | 'certification',
        status: (doc.verification_status === 'verified' ? 'approved' : doc.verification_status) as 'pending' | 'approved' | 'rejected',
        uploadDate: doc.upload_date,
        extractedTitle: extractTitleFromFilename(doc.file_name)
      }));

      setDocuments(mappedDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Get authenticated user
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('User not authenticated');
        
        // Use targetUserId for admin context, otherwise use current user
        const userId = targetUserId || user.user.id;
        
        // Upload to Supabase storage with proper folder structure
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(`${userId}/${fileName}`, file);

        if (uploadError) throw uploadError;

        // Auto-detect document type based on filename/content
        const detectedType = detectDocumentType(file.name);
        const extractedTitle = extractTitleFromFilename(file.name);

        // Save to database
        const { data: docData, error: docError } = await supabase
          .from('nanny_documents')
          .insert({
            nanny_id: userId,
            document_type: detectedType,
            file_name: file.name,
            file_url: uploadData.path,
            verification_status: 'pending'
          })
          .select()
          .single();

        if (docError) throw docError;

        // Add to local state
        const newDoc: UploadedDocument = {
          id: docData.id,
          name: file.name,
          type: detectedType as 'id_document' | 'criminal_check' | 'reference_letter' | 'certification',
          status: 'pending',
          uploadDate: new Date().toISOString(),
          extractedTitle
        };

        setDocuments(prev => [...prev, newDoc]);
      }

      // Reload documents to ensure consistency
      setTimeout(() => {
        loadExistingDocuments();
      }, 1000);

      toast({
        title: "Documents uploaded successfully",
        description: isAdminView 
          ? "Documents uploaded for nanny. You can now approve or reject them."
          : "Your documents are being processed. You'll be notified once verified.",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      // Show more specific error message to help diagnose the issue
      const errorMessage = error?.message || error?.error?.message || 'Unknown error';
      let userMessage = "Please try again or contact support.";
      
      if (errorMessage.includes('Bucket') || errorMessage.includes('bucket')) {
        userMessage = "Storage bucket not found. Please contact support.";
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied') || errorMessage.includes('RLS')) {
        userMessage = "Permission denied. Please ensure you're logged in and have the correct permissions.";
      } else if (errorMessage.includes('not authenticated') || errorMessage.includes('JWT')) {
        userMessage = "Authentication required. Please log in again.";
      } else if (errorMessage.includes('size') || errorMessage.includes('too large')) {
        userMessage = "File is too large. Maximum size is 10MB.";
      }
      
      toast({
        title: "Upload failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const detectDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase();
    
    // Enhanced passport and immigration detection (priority for foreign nannies)
    if (lower.includes('passport') || lower.includes('immigration') || lower.includes('permit') || 
        lower.includes('visa') || lower.includes('asylum') || lower.includes('id') || 
        lower.includes('identity')) {
      return 'id_document';
    }
    
    // Criminal/background check documents
    if (lower.includes('criminal') || lower.includes('background') || lower.includes('police') || 
        lower.includes('clearance')) {
      return 'criminal_check';
    }
    
    // Reference letters, CVs, employment documents
    if (lower.includes('cv') || lower.includes('resume') || lower.includes('reference') || 
        lower.includes('letter') || lower.includes('recommendation')) {
      return 'reference_letter';
    }
    
    // Certifications and qualifications (fallback for most other documents)
    return 'certification';
  };

  const extractTitleFromFilename = (filename: string): string => {
    // Remove file extension and common prefixes
    let title = filename.replace(/\.[^/.]+$/, '');
    title = title.replace(/^(certificate|cert|diploma)_?/i, '');
    title = title.replace(/_/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent('Document Upload Assistance Required');
    const body = encodeURIComponent(`Hi NannyGold Support,

I'm having trouble uploading my documents through the profile section. Could you please assist me with the upload process?

My profile details:
- Name: [Your name]
- Email: [Your email]
- Phone: [Your phone]

Documents I need to upload:
- [ ] ID Document
- [ ] Certifications
- [ ] Other: ___________

Please let me know how I can send these documents securely.

Thank you for your assistance.

Best regards`);
    
    window.location.href = `mailto:care@nannygold.co.za?subject=${subject}&body=${body}`;
  };

  const removeDocument = async (docId: string) => {
    try {
      await supabase
        .from('nanny_documents')
        .delete()
        .eq('id', docId);
      
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      toast({
        title: "Document removed",
        description: "The document has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Error removing document",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const requestReupload = (docId: string) => {
    // Remove current document and allow re-upload
    removeDocument(docId);
    toast({
      title: "Re-upload requested",
      description: "Please upload a clearer version of your document.",
    });
  };

  const approveDocument = async (docId: string) => {
    try {
      await supabase
        .from('nanny_documents')
        .update({ verification_status: 'verified' })
        .eq('id', docId);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, status: 'approved' } : doc
      ));
      
      toast({
        title: "Document approved",
        description: "The document has been approved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error approving document",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const rejectDocument = async (docId: string) => {
    try {
      await supabase
        .from('nanny_documents')
        .update({ verification_status: 'rejected' })
        .eq('id', docId);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, status: 'rejected' } : doc
      ));
      
      toast({
        title: "Document rejected",
        description: "The document has been rejected and the nanny will be notified.",
      });
    } catch (error) {
      toast({
        title: "Error rejecting document",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Upload className="w-5 h-5" />
          Upload Documents
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload your passport, ID, permits, visa, asylum documents, certifications, and reference letters. Documents will be automatically categorized and verified.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {dragActive ? 'Drop files here!' : 'Drop files here or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: PDF, Word (DOC, DOCX), Images (JPG, PNG, GIF, WebP, BMP, TIFF) (Max 10MB per file)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
              <Button 
                variant="outline" 
                disabled={uploading}
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Files
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Uploaded Documents */}
          {loading ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Loading your documents...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Uploaded Documents</h4>
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {doc.extractedTitle || doc.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {doc.type}
                        </Badge>
                        {doc.status === 'pending' && (
                          <Badge variant="secondary" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Pending Review
                          </Badge>
                        )}
                        {doc.status === 'approved' && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {doc.status === 'rejected' && (
                          <Badge variant="destructive" className="text-xs">
                            <X className="w-3 h-3 mr-1" />
                            Needs Re-upload
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdminView && doc.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => approveDocument(doc.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => rejectDocument(doc.id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {!isAdminView && doc.status === 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestReupload(doc.id)}
                      >
                        Re-upload
                      </Button>
                    )}
                    {!isAdminView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            </div>
          )}

          {/* Email Support Option - Only show if not hidden */}
          {!hideEmailSupport && (
            <div className="border-t pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Having trouble uploading? We're here to help!
                </p>
                <Button variant="outline" onClick={handleEmailSupport} className="gap-2">
                  <Mail className="w-4 h-4" />
                  Email Support
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
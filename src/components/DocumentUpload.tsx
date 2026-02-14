import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  // Test storage bucket access
  const testStorageAccess = async () => {
    try {
      console.log('🔍 Testing storage bucket access...');
      
      // Try direct access to document bucket since listBuckets() has permission issues
      console.log('🔍 Testing direct access to document bucket...');
      const { data: files, error: bucketError } = await supabase.storage
        .from('document')
        .list();
      
      if (bucketError) {
        console.error('❌ Error accessing document bucket:', bucketError);
        
        // Try documents (plural) as fallback
        console.log('🔍 Trying documents bucket (plural)...');
        const { data: files2, error: bucketError2 } = await supabase.storage
          .from('documents')
          .list();
          
        if (bucketError2) {
          console.error('❌ Error accessing documents bucket:', bucketError2);
          toast({
            title: "Storage Access Error",
            description: "Cannot access document storage. Please check your Supabase configuration.",
            variant: "destructive",
          });
          return false;
        } else {
          console.log('✅ Documents bucket (plural) is accessible');
          return true;
        }
      }
      
      console.log('✅ Document bucket (singular) is accessible');
      return true;
      
    } catch (error) {
      console.error('❌ Storage test error:', error);
      toast({
        title: "Storage Connection Error",
        description: "Unable to access storage. Please check your internet connection and Supabase configuration.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Helper function to ensure nanny record exists
  const ensureNannyRecord = async (userId: string): Promise<boolean> => {
    try {
      console.log('🔍 Checking nanny record for user:', userId);
      
      // Check if nanny record exists
      const { data: nannyRecord, error: nannyError } = await supabase
        .from('nannies')
        .select('id')
        .eq('id', userId)
        .single();

      if (nannyError || !nannyRecord) {
        console.log('⚠️ Nanny record not found, creating one...');
        
        // Create the nanny record if it doesn't exist
        const { data: newNannyRecord, error: createError } = await supabase
          .from('nannies')
          .insert({
            id: userId,
            bio: '',
            experience_level: '1-3',
            languages: ['English'],
            skills: ['Childcare'],
            hourly_rate: null,
            monthly_rate: null,
            approval_status: 'pending',
            is_verified: false,
            is_available: false,
            can_receive_bookings: false,
            service_categories: [],
            admin_assigned_categories: [],
            admin_notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError || !newNannyRecord) {
          console.error('❌ Failed to create nanny record:', createError);
          return false;
        }

        console.log('✅ Nanny record created successfully:', newNannyRecord.id);
      } else {
        console.log('✅ Nanny record already exists:', nannyRecord.id);
      }

      return true;
    } catch (error) {
      console.error('❌ Error ensuring nanny record:', error);
      return false;
    }
  };

  // Load existing documents on mount and when targetUserId changes
  useEffect(() => {
    loadExistingDocuments();
  }, [targetUserId]);

  const loadExistingDocuments = async () => {
    try {
      // Test storage access first
      const storageOk = await testStorageAccess();
      if (!storageOk) {
        console.log('⚠️ Storage access test failed, but continuing...');
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Use targetUserId for admin context, otherwise use current user
      const userId = targetUserId || user.user.id;

      // Ensure nanny record exists
      const nannyRecordExists = await ensureNannyRecord(userId);
      if (!nannyRecordExists) {
        console.log('Failed to create nanny record, skipping document load');
        setDocuments([]);
        return;
      }

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

    // First check if storage is properly configured
    const storageOk = await testStorageAccess();
    if (!storageOk) {
      return; // Error message already shown in testStorageAccess
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        console.log('🔄 Starting upload for file:', file.name);
        
        // Basic file size check (10MB)
        if (file.size > 10 * 1024 * 1024) {
          console.log('❌ File too large:', file.size);
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 10MB limit.`,
            variant: "destructive",
          });
          continue;
        }

        // Get authenticated user
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          console.log('❌ User not authenticated');
          throw new Error('User not authenticated');
        }

        console.log('✅ User authenticated:', user.user.id);

        // Use targetUserId for admin context, otherwise use current user
        const userId = targetUserId || user.user.id;
        console.log('📝 Using user ID:', userId);

        // Ensure nanny record exists
        const nannyRecordExists = await ensureNannyRecord(userId);
        if (!nannyRecordExists) {
          console.log('❌ Failed to create nanny record');
          throw new Error('Unable to create nanny profile. Please contact support.');
        }

        console.log('✅ Nanny record exists');

        // Upload to Supabase storage with proper folder structure
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        console.log('📤 Uploading to storage:', filePath);

        // Try document (singular) first, then documents (plural) as fallback
        let uploadData, uploadError;
        
        try {
          const result = await supabase.storage
            .from('document')
            .upload(filePath, file);
          uploadData = result.data;
          uploadError = result.error;
        } catch (err) {
          console.log('🔍 document bucket failed, trying documents bucket...');
          const result = await supabase.storage
            .from('documents')
            .upload(filePath, file);
          uploadData = result.data;
          uploadError = result.error;
        }

        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('✅ File uploaded to storage:', uploadData);

        // Auto-detect document type based on filename/content
        const detectedType = detectDocumentType(file.name);
        const extractedTitle = extractTitleFromFilename(file.name);

        console.log('🔍 Document type detected:', detectedType);

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

        if (docError) {
          console.error('❌ Database insert error:', docError);
          throw docError;
        }

        if (!docData) {
          console.log('❌ Failed to save document record');
          throw new Error('Failed to save document record');
        }

        console.log('✅ Document saved to database:', docData);

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
        console.log('✅ Document added to local state');
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
      console.error('❌ Upload error details:', error);
      
      let errorMessage = "Please try again or contact support.";
      if (error.message?.includes('Nanny profile not found')) {
        errorMessage = "Please complete your nanny profile first before uploading documents.";
      } else if (error.message?.includes('Unable to create nanny profile')) {
        errorMessage = "We couldn't set up your nanny profile automatically. Please contact support for assistance.";
      } else if (error.message?.includes('nanny_documents_nanny_id_fkey')) {
        errorMessage = "Profile setup required. Please complete your nanny profile registration first.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const detectDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase();

    // ID Document detection - matches 'id_document' in DB constraint
    if (lower.includes('passport') || lower.includes('id_') || lower.includes('identity') ||
      lower.includes('identification') || (lower.includes('id') && lower.split(/[._-]/).includes('id'))) {
      return 'id_document';
    }

    // CV/Resume/Reference detection - matches 'reference_letter' in DB constraint
    if (lower.includes('cv') || lower.includes('resume') || lower.includes('curriculum') ||
      lower.includes('reference') || lower.includes('letter') || lower.includes('recommendation')) {
      return 'reference_letter';
    }

    // Criminal/background check documents - matches 'criminal_check' in DB constraint
    if (lower.includes('criminal') || lower.includes('background') || lower.includes('police') ||
      lower.includes('clearance')) {
      return 'criminal_check';
    }

    // Immigration documents - map to 'id_document' as they serve a similar purpose
    if (lower.includes('permit') || lower.includes('visa') || lower.includes('asylum') || lower.includes('immigration')) {
      return 'id_document';
    }

    // Certifications and qualifications - matches 'certification' in DB constraint
    if (lower.includes('cert') || lower.includes('qualification') || lower.includes('diploma') || lower.includes('degree')) {
      return 'certification';
    }

    return 'certification'; // Fallback to 'certification' as it's the safest generic type in the DB list
  };

  const extractTitleFromFilename = (filename: string): string => {
    // Remove file extension and common prefixes
    let title = filename.replace(/\.[^/.]+$/, '');
    title = title.replace(/^(certificate|cert|diploma)_?/i, '');
    title = title.replace(/_/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  const getDocTypeLabel = (type: string, name: string) => {
    const lowerName = name.toLowerCase();

    if (type === 'reference_letter') {
      if (lowerName.includes('cv') || lowerName.includes('resume') || lowerName.includes('curriculum')) {
        return 'CV / Resume';
      }
      return 'Reference Letter';
    }

    if (type === 'id_document') {
      if (lowerName.includes('passport')) return 'Passport';
      if (lowerName.includes('permit')) return 'Work Permit';
      if (lowerName.includes('visa')) return 'Visa';
      if (lowerName.includes('asylum')) return 'Asylum Document';
      return 'ID Document';
    }

    if (type === 'criminal_check') return 'Criminal Record Check';
    if (type === 'certification') return 'Certification';
    if (type === 'bank_details') return 'Bank Details';
    if (type === 'medical_certificate') return 'Medical Certificate';

    return type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1);
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
          Upload your passport, ID, <strong>CV/Resume</strong>, certifications, and reference letters. Documents are automatically categorized.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-fuchsia-50/50 border border-fuchsia-100 rounded-lg">
            <h4 className="text-xs font-semibold text-fuchsia-900 uppercase tracking-wider mb-2">Required for Profile</h4>
            <ul className="space-y-1">
              <li className="flex items-center text-xs text-fuchsia-800">
                <CheckCircle className={`w-3 h-3 mr-2 ${documents.some(d => d.type === 'id_document') ? 'text-green-500' : 'text-fuchsia-300'}`} />
                ID / Passport / Permit
              </li>
              <li className="flex items-center text-xs text-fuchsia-800">
                <CheckCircle className={`w-3 h-3 mr-2 ${documents.some(d => d.type === 'reference_letter' && (d.name.toLowerCase().includes('cv') || d.name.toLowerCase().includes('resume'))) ? 'text-green-500' : 'text-fuchsia-300'}`} />
                CV / Resume
              </li>
            </ul>
          </div>
          <div className="p-3 bg-muted/30 border border-muted-foreground/10 rounded-lg">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Flexible Upload</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              You can upload files 1-by-1 as you get them, or all at once. Click "Choose Files" or drag them into the box below.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
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
                Supported: PDF, JPG, PNG, GIF, WebP (Max 10MB per file)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
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
                        <Badge variant="outline" className="text-xs bg-white">
                          {getDocTypeLabel(doc.type, doc.name)}
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
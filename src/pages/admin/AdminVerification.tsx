import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Shield,
  UserCheck,
  Loader2,
  Upload,
  Plus
} from 'lucide-react';

interface NannyVerification {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  verification_status: string;
  interview_status: string;
  approval_status: string;
  profile_submitted_at: string | null;
  created_at: string;
  documents: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
  };
  verification_steps: {
    step_name: string;
    status: string;
    completed_at: string | null;
    notes: string | null;
  }[];
}

interface DocumentDetails {
  id: string;
  document_type: string;
  file_name: string;
  verification_status: string;
  rejection_reason: string | null;
  file_url: string;
  upload_date: string;
}

const VERIFICATION_STEPS = [
  { key: 'document_verification', label: 'Document Verification', icon: FileText },
  { key: 'background_check', label: 'Background Check', icon: Shield },
  { key: 'reference_check', label: 'Reference Verification', icon: UserCheck },
  { key: 'interview_completed', label: 'Interview', icon: User }
];

const DOCUMENT_TYPES = [
  'id_document',
  'criminal_check',
  'reference_letter',
  'certification',
  'bank_details',
  'medical_certificate'
];

export default function AdminVerification() {
  const navigate = useNavigate();
  const [nannies, setNannies] = useState<NannyVerification[]>([]);
  const [filteredNannies, setFilteredNannies] = useState<NannyVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending_verification');
  const [selectedNanny, setSelectedNanny] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentDetails[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [processingVerification, setProcessingVerification] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadNannyId, setUploadNannyId] = useState<string>('');
  const [uploadDocumentType, setUploadDocumentType] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNannyVerifications();
  }, []);

  useEffect(() => {
    filterNannies();
  }, [searchTerm, selectedTab, nannies]);

  const loadNannyVerifications = async () => {
    try {
      const { data: nanniesData, error } = await supabase
        .from('nannies')
        .select(`
          id,
          bio,
          verification_status,
          interview_status,
          approval_status,
          profile_submitted_at,
          created_at,
          profiles!inner(
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('profile_submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Get document counts for each nanny
      const nannyIds = nanniesData.map(n => n.id);
      const { data: documentsData, error: docError } = await supabase
        .from('nanny_documents')
        .select('nanny_id, verification_status')
        .in('nanny_id', nannyIds);

      if (docError) throw docError;

      // Get verification steps for each nanny
      const { data: stepsData, error: stepsError } = await supabase
        .from('nanny_verification_steps')
        .select('nanny_id, step_name, status, completed_at, notes')
        .in('nanny_id', nannyIds);

      if (stepsError) throw stepsError;

      const processedNannies = nanniesData.map(nanny => {
        const docs = documentsData?.filter(d => d.nanny_id === nanny.id) || [];
        const steps = stepsData?.filter(s => s.nanny_id === nanny.id) || [];

        return {
          id: nanny.id,
          first_name: nanny.profiles.first_name || '',
          last_name: nanny.profiles.last_name || '',
          email: nanny.profiles.email || '',
          phone: nanny.profiles.phone || '',
          bio: nanny.bio || '',
          verification_status: nanny.verification_status || 'document_pending',
          interview_status: nanny.interview_status || 'not_scheduled',
          approval_status: nanny.approval_status || 'pending',
          profile_submitted_at: nanny.profile_submitted_at,
          created_at: nanny.created_at,
          documents: {
            total: docs.length,
            verified: docs.filter(d => d.verification_status === 'verified').length,
            pending: docs.filter(d => d.verification_status === 'pending').length,
            rejected: docs.filter(d => d.verification_status === 'rejected').length
          },
          verification_steps: steps.map(step => ({
            step_name: step.step_name,
            status: step.status,
            completed_at: step.completed_at,
            notes: step.notes
          }))
        };
      });

      setNannies(processedNannies);
    } catch (error) {
      console.error('Error loading nanny verifications:', error);
      toast({
        title: "Error loading verifications",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterNannies = () => {
    let filtered = nannies;

    // Filter by tab
    if (selectedTab === 'pending_verification') {
      filtered = filtered.filter(n =>
        n.verification_status === 'document_pending' ||
        n.documents.pending > 0 ||
        (n.documents.verified > 0 && n.verification_status !== 'verified')
      );
    } else if (selectedTab === 'interview_required') {
      filtered = filtered.filter(n => n.verification_status === 'interview_required');
    } else if (selectedTab === 'completed') {
      filtered = filtered.filter(n => n.verification_status === 'verified');
    } else if (selectedTab === 'rejected') {
      filtered = filtered.filter(n => n.documents.rejected > 0 || n.approval_status === 'rejected');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNannies(filtered);
  };

  const loadNannyDocuments = async (nannyId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('nanny_documents')
        .select('*')
        .eq('nanny_id', nannyId)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error loading documents",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const updateDocumentStatus = async (documentId: string, status: string, reason?: string) => {
    try {
      const updateData: any = { verification_status: status };
      if (reason) updateData.rejection_reason = reason;

      const { error } = await supabase
        .from('nanny_documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      // Reload documents
      if (selectedNanny) {
        await loadNannyDocuments(selectedNanny);
      }

      // Reload nannies to update counts
      await loadNannyVerifications();

      toast({
        title: `Document ${status}`,
        description: `The document has been ${status}.`,
      });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error updating document",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const completeVerificationStep = async (nannyId: string, stepName: string, status: string) => {
    setProcessingVerification(true);
    try {
      // Use the database function to update verification steps
      const { error } = await supabase.rpc('update_verification_step', {
        p_nanny_id: nannyId,
        p_step_name: stepName,
        p_status: status,
        p_notes: verificationNotes || null
      });

      if (error) throw error;

      // Reload data
      await loadNannyVerifications();
      setVerificationNotes('');

      toast({
        title: "Verification step updated",
        description: `${stepName.replace('_', ' ')} has been marked as ${status}.`,
      });
    } catch (error) {
      console.error('Error updating verification step:', error);
      toast({
        title: "Error updating verification",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingVerification(false);
    }
  };

  const scheduleInterview = async (nannyId: string) => {
    try {
      // Create interview record
      const { error } = await supabase
        .from('interviews')
        .insert({
          client_id: nannyId, // Admin creating interview
          nanny_id: nannyId,
          interview_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 1 week from now
          interview_time: '10:00:00',
          status: 'scheduled',
          notes: 'Verification interview scheduled by admin'
        });

      if (error) throw error;

      toast({
        title: "Interview scheduled",
        description: "The verification interview has been scheduled.",
      });
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast({
        title: "Error scheduling interview",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const uploadDocumentForNanny = async () => {
    if (!uploadFile || !uploadNannyId || !uploadDocumentType) {
      toast({
        title: "Missing information",
        description: "Please select a file, document type, and nanny.",
        variant: "destructive",
      });
      return;
    }

    setUploadingDocument(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${uploadNannyId}_${uploadDocumentType}_${Date.now()}.${fileExt}`;
      const filePath = `nanny-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insert document record
      const { error: dbError } = await supabase
        .from('nanny_documents')
        .insert({
          nanny_id: uploadNannyId,
          document_type: uploadDocumentType,
          file_name: uploadFile.name,
          file_url: publicUrl,
          verification_status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully.",
      });

      // Reset form and close dialog
      setUploadFile(null);
      setUploadDocumentType('');
      setUploadNannyId('');
      setShowUploadDialog(false);

      // Reload data
      await loadNannyVerifications();
      if (selectedNanny) {
        await loadNannyDocuments(selectedNanny);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'interview_required':
        return <Badge className="bg-blue-100 text-blue-800">Interview Required</Badge>;
      case 'document_pending':
        return <Badge variant="outline">Documents Pending</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getStepStatus = (nanny: NannyVerification, stepKey: string) => {
    const step = nanny.verification_steps.find(s => s.step_name === stepKey);
    return step?.status || 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Onboarding & Verification</h1>
        <p className="text-muted-foreground">
          Manage nanny document verification and onboarding process
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search nannies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document for Nanny</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="nanny-select">Select Nanny</Label>
                <Select value={uploadNannyId} onValueChange={setUploadNannyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a nanny" />
                  </SelectTrigger>
                  <SelectContent>
                    {nannies.map((nanny) => (
                      <SelectItem key={nanny.id} value={nanny.id}>
                        {nanny.first_name} {nanny.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Select value={uploadDocumentType} onValueChange={setUploadDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file-upload">Document File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={uploadDocumentForNanny}
                  disabled={uploadingDocument || !uploadFile || !uploadNannyId || !uploadDocumentType}
                  className="flex-1"
                >
                  {uploadingDocument ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(false)}
                  disabled={uploadingDocument}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending_verification">
            Pending Verification ({nannies.filter(n =>
              n.verification_status === 'document_pending' ||
              n.documents.pending > 0 ||
              (n.documents.verified > 0 && n.verification_status !== 'verified')
            ).length})
          </TabsTrigger>
          <TabsTrigger value="interview_required">
            Interview Required ({nannies.filter(n => n.verification_status === 'interview_required').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Verified ({nannies.filter(n => n.verification_status === 'verified').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Issues ({nannies.filter(n => n.documents.rejected > 0 || n.approval_status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredNannies.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No nannies found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search.' : 'No nannies match the current filter.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredNannies.map((nanny) => (
                <Card key={nanny.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {nanny.first_name} {nanny.last_name}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {nanny.email}
                            </span>
                            {nanny.phone && (
                              <span className="flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {nanny.phone}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(nanny.verification_status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Verification Steps</h4>
                          <div className="space-y-2">
                            {VERIFICATION_STEPS.map((step) => {
                              const status = getStepStatus(nanny, step.key);
                              const IconComponent = step.icon;

                              return (
                                <div key={step.key} className="flex items-center space-x-2 text-sm">
                                  <IconComponent className="w-4 h-4" />
                                  <span className="flex-1">{step.label}</span>
                                  {status === 'completed' ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : status === 'rejected' ? (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-yellow-500" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Documents Status</h4>
                          <div className="flex space-x-4 text-sm">
                            <span className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              Total: {nanny.documents.total}
                            </span>
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {nanny.documents.verified}
                            </span>
                            <span className="flex items-center text-yellow-600">
                              <Clock className="w-4 h-4 mr-1" />
                              {nanny.documents.pending}
                            </span>
                            {nanny.documents.rejected > 0 && (
                              <span className="flex items-center text-red-600">
                                <XCircle className="w-4 h-4 mr-1" />
                                {nanny.documents.rejected}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex space-x-2">
                          {nanny.verification_status === 'interview_required' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                if ((window as any).scheduleInterviewForNanny) {
                                  (window as any).scheduleInterviewForNanny(
                                    nanny.id,
                                    `${nanny.first_name} ${nanny.last_name}`
                                  );
                                } else {
                                  navigate('/admin/interviews');
                                }
                              }}
                              className="flex items-center gap-1"
                            >
                              <Calendar className="w-4 h-4" />
                              Schedule Interview
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedNanny(nanny.id);
                                  loadNannyDocuments(nanny.id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review Documents
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  Document Verification - {nanny.first_name} {nanny.last_name}
                                </DialogTitle>
                              </DialogHeader>

                              {loadingDocuments ? (
                                <div className="text-center py-8">
                                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                  <p className="mt-2">Loading documents...</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {documents.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                      No documents uploaded yet
                                    </p>
                                  ) : (
                                    documents.map((doc) => (
                                      <Card key={doc.id}>
                                        <CardContent className="p-4">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                              <FileText className="w-5 h-5" />
                                              <div>
                                                <p className="font-medium">{doc.file_name}</p>
                                                <p className="text-sm text-muted-foreground capitalize">
                                                  {doc.document_type.replace('_', ' ')} •
                                                  Uploaded {new Date(doc.upload_date).toLocaleDateString()}
                                                </p>
                                                {doc.rejection_reason && (
                                                  <p className="text-sm text-red-600 mt-1">
                                                    Rejection reason: {doc.rejection_reason}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              {getStatusBadge(doc.verification_status)}
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(doc.file_url, '_blank')}
                                              >
                                                <ExternalLink className="w-4 h-4" />
                                              </Button>
                                              {doc.verification_status === 'pending' && (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    onClick={() => updateDocumentStatus(doc.id, 'verified')}
                                                  >
                                                    Approve
                                                  </Button>
                                                  <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => {
                                                      const reason = prompt('Rejection reason:');
                                                      if (reason) {
                                                        updateDocumentStatus(doc.id, 'rejected', reason);
                                                      }
                                                    }}
                                                  >
                                                    Reject
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))
                                  )}

                                  {/* Verification Actions */}
                                  <div className="border-t pt-4 space-y-4">
                                    <div>
                                      <Label htmlFor="notes">Verification Notes</Label>
                                      <Textarea
                                        id="notes"
                                        placeholder="Add notes about the verification process..."
                                        value={verificationNotes}
                                        onChange={(e) => setVerificationNotes(e.target.value)}
                                      />
                                    </div>

                                    <div className="flex space-x-2">
                                      {nanny.documents.verified > 0 && getStepStatus(nanny, 'document_verification') !== 'completed' && (
                                        <Button
                                          onClick={() => completeVerificationStep(nanny.id, 'document_verification', 'completed')}
                                          disabled={processingVerification}
                                        >
                                          {processingVerification ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          ) : (
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                          )}
                                          Approve Documents
                                        </Button>
                                      )}

                                      {nanny.verification_status === 'interview_required' && (
                                        <Button
                                          variant="outline"
                                          onClick={() => scheduleInterview(nanny.id)}
                                        >
                                          <Calendar className="w-4 h-4 mr-2" />
                                          Schedule Interview
                                        </Button>
                                      )}

                                      {nanny.verification_status === 'interview_required' && (
                                        <Button
                                          onClick={() => completeVerificationStep(nanny.id, 'interview_completed', 'completed')}
                                          disabled={processingVerification}
                                        >
                                          {processingVerification ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          ) : (
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                          )}
                                          Mark Interview Complete
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
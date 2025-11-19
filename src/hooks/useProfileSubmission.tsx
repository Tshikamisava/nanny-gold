import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentRequirement {
  type: string;
  name: string;
  required: boolean;
}

interface DocumentValidation {
  hasRequiredDocuments: boolean;
  hasRejectedDocuments: boolean;
  missingDocuments: string[];
  rejectedDocuments: string[];
  canSubmit: boolean;
}

const REQUIRED_DOCUMENTS: DocumentRequirement[] = [
  { type: 'id', name: 'ID Document, Passport, or Immigration Status Document', required: true },
  { type: 'cv', name: 'CV/Resume', required: true },
  { type: 'immigration', name: 'Immigration Status Document', required: false }, // Optional since it can serve as ID
];

export const useProfileSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [documentValidation, setDocumentValidation] = useState<DocumentValidation>({
    hasRequiredDocuments: false,
    hasRejectedDocuments: false,
    missingDocuments: [],
    rejectedDocuments: [],
    canSubmit: false,
  });
  const { toast } = useToast();

  const checkDocumentValidation = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: documents, error } = await supabase
        .from('nanny_documents')
        .select('document_type, verification_status, file_name')
        .eq('nanny_id', user.user.id);

      if (error) throw error;

      const missingDocuments: string[] = [];
      const rejectedDocuments: string[] = [];
      
      REQUIRED_DOCUMENTS.forEach((reqDoc) => {
        if (reqDoc.type === 'id') {
          // For ID documents, accept ID, passport, or immigration documents
          const idDocs = documents?.filter(doc => 
            doc.document_type === 'id' || 
            doc.document_type === 'immigration' ||
            (doc.document_type === 'other' && (
              doc.file_name.toLowerCase().includes('passport') ||
              doc.file_name.toLowerCase().includes('immigration') ||
              doc.file_name.toLowerCase().includes('asylum')
            ))
          ) || [];

          if (idDocs.length === 0) {
            missingDocuments.push(reqDoc.name);
          } else {
            const hasVerifiedOrPending = idDocs.some(doc => 
              doc.verification_status === 'verified' || doc.verification_status === 'pending'
            );
            const hasRejected = idDocs.some(doc => doc.verification_status === 'rejected');
            
            if (!hasVerifiedOrPending) {
              missingDocuments.push(reqDoc.name);
            }
            if (hasRejected) {
              rejectedDocuments.push(reqDoc.name);
            }
          }
        } else if (reqDoc.required) {
          // For other required documents (CV)
          const matchingDocs = documents?.filter(doc => 
            doc.document_type === reqDoc.type || 
            (reqDoc.type === 'cv' && (doc.document_type === 'other' && doc.file_name.toLowerCase().includes('cv')))
          ) || [];

          if (matchingDocs.length === 0) {
            missingDocuments.push(reqDoc.name);
          } else {
            const hasVerifiedOrPending = matchingDocs.some(doc => 
              doc.verification_status === 'verified' || doc.verification_status === 'pending'
            );
            const hasRejected = matchingDocs.some(doc => doc.verification_status === 'rejected');
            
            if (!hasVerifiedOrPending) {
              missingDocuments.push(reqDoc.name);
            }
            if (hasRejected) {
              rejectedDocuments.push(reqDoc.name);
            }
          }
        }
      });

      const hasRequiredDocuments = missingDocuments.length === 0;
      const hasRejectedDocuments = rejectedDocuments.length > 0;
      const canSubmit = hasRequiredDocuments && !hasRejectedDocuments && hasChanges;

      setDocumentValidation({
        hasRequiredDocuments,
        hasRejectedDocuments,
        missingDocuments,
        rejectedDocuments,
        canSubmit,
      });
    } catch (error) {
      console.error('Error checking document validation:', error);
    }
  };

  const submitProfile = async () => {
    if (!documentValidation.canSubmit) return;

    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Update nanny profile with submission timestamp
      const { error } = await supabase
        .from('nannies')
        .update({ 
          profile_submitted_at: new Date().toISOString(),
          approval_status: 'pending'
        })
        .eq('id', user.user.id);

      if (error) throw error;

      toast({
        title: "Profile submitted successfully!",
        description: "Your profile has been submitted for admin review. You'll be notified once it's approved.",
      });

      setHasChanges(false);
      await checkDocumentValidation();
    } catch (error) {
      console.error('Error submitting profile:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    checkDocumentValidation();
  }, []);

  return {
    isSubmitting,
    hasChanges,
    setHasChanges,
    documentValidation,
    checkDocumentValidation,
    submitProfile,
  };
};
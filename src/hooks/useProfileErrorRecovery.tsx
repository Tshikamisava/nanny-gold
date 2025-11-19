import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClientProfileData } from '@/services/clientProfileService';

interface RetryOperation {
  id: string;
  operation: () => Promise<any>;
  maxRetries: number;
  currentRetries: number;
}

export const useProfileErrorRecovery = () => {
  const { toast } = useToast();
  const [retryQueue, setRetryQueue] = useState<RetryOperation[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  const addRetryOperation = useCallback((
    id: string, 
    operation: () => Promise<any>, 
    maxRetries: number = 3
  ) => {
    setRetryQueue(prev => [
      ...prev.filter(op => op.id !== id), // Remove existing operation with same ID
      { id, operation, maxRetries, currentRetries: 0 }
    ]);
  }, []);

  const executeRetry = useCallback(async (operationId: string) => {
    const operation = retryQueue.find(op => op.id === operationId);
    if (!operation) return false;

    setIsRetrying(true);
    
    try {
      await operation.operation();
      
      // Remove successful operation from queue
      setRetryQueue(prev => prev.filter(op => op.id !== operationId));
      
      toast({
        title: "Success",
        description: "Operation completed successfully after retry.",
      });
      
      setIsRetrying(false);
      return true;
    } catch (error: any) {
      const updatedOperation = {
        ...operation,
        currentRetries: operation.currentRetries + 1
      };

      if (updatedOperation.currentRetries >= updatedOperation.maxRetries) {
        // Remove failed operation from queue
        setRetryQueue(prev => prev.filter(op => op.id !== operationId));
        
        toast({
          title: "Operation Failed",
          description: `Failed after ${updatedOperation.maxRetries} attempts: ${error.message}`,
          variant: "destructive"
        });
      } else {
        // Update retry count
        setRetryQueue(prev => prev.map(op => 
          op.id === operationId ? updatedOperation : op
        ));
        
        toast({
          title: "Retry Available",
          description: `Attempt ${updatedOperation.currentRetries} failed. ${updatedOperation.maxRetries - updatedOperation.currentRetries} attempts remaining.`,
          variant: "destructive"
        });
      }
      
      setIsRetrying(false);
      return false;
    }
  }, [retryQueue, toast]);

  const clearRetryQueue = useCallback(() => {
    setRetryQueue([]);
  }, []);

  const validateProfileBeforeSave = useCallback((profileData: ClientProfileData) => {
    const issues: string[] = [];

    // Check for common issues that cause save failures
    if (profileData.childrenAges) {
      // Check for invalid children ages
      const invalidAges = profileData.childrenAges.filter(age => 
        age && age.length > 0 && !/^[0-9\s\w.]+$/.test(age)
      );
      
      if (invalidAges.length > 0) {
        issues.push(`Invalid characters in children ages: ${invalidAges.join(', ')}`);
      }
    }

    // Check other dependents
    if (profileData.otherDependents !== undefined) {
      if (isNaN(profileData.otherDependents) || profileData.otherDependents < 0) {
        issues.push('Number of other dependents must be a valid positive number');
      }
    }

    // Check required fields for specific operations
    const criticalFields = ['firstName', 'lastName'];
    const missingCritical = criticalFields.filter(field => 
      !profileData[field as keyof ClientProfileData] || 
      String(profileData[field as keyof ClientProfileData]).trim() === ''
    );
    
    if (missingCritical.length > 0) {
      issues.push(`Missing critical information: ${missingCritical.join(', ')}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }, []);

  const handleProfileSaveError = useCallback((error: any, profileData: ClientProfileData, retryFn: () => Promise<any>) => {
    console.error('Profile save error details:', error);
    
    // Analyze the error and provide specific guidance
    let errorCategory = 'unknown';
    let userMessage = 'An unexpected error occurred';
    let canRetry = true;
    
    if (error.message?.toLowerCase().includes('children')) {
      errorCategory = 'children_data';
      userMessage = 'There was an issue with the children information. Please check the ages format.';
    } else if (error.message?.toLowerCase().includes('dependents')) {
      errorCategory = 'dependents_data';
      userMessage = 'There was an issue with the number of dependents. Please enter a valid number.';
    } else if (error.message?.toLowerCase().includes('authentication') || error.message?.toLowerCase().includes('auth')) {
      errorCategory = 'auth_error';
      userMessage = 'Authentication error. Please refresh the page and try again.';
      canRetry = false;
    } else if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch')) {
      errorCategory = 'network_error';
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (error.code === 'PGRST116') {
      errorCategory = 'validation_error';
      userMessage = 'Data validation failed. Please check all fields and try again.';
    }

    // Perform pre-validation
    const validation = validateProfileBeforeSave(profileData);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.issues[0],
        variant: "destructive"
      });
      return;
    }

    if (canRetry) {
      addRetryOperation(`profile_save_${errorCategory}`, retryFn);
      
      toast({
        title: "Save Failed",
        description: userMessage + " Click here to retry.",
        variant: "destructive",
        action: {
          altText: "Retry",
          onClick: () => executeRetry(`profile_save_${errorCategory}`)
        } as any
      });
    } else {
      toast({
        title: "Save Failed",
        description: userMessage,
        variant: "destructive"
      });
    }
  }, [addRetryOperation, executeRetry, toast, validateProfileBeforeSave]);

  return {
    addRetryOperation,
    executeRetry,
    clearRetryQueue,
    handleProfileSaveError,
    validateProfileBeforeSave,
    isRetrying,
    retryQueue: retryQueue.length > 0 ? retryQueue : null
  };
};
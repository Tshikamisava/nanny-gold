import { CheckCircle2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProfileSaveConfirmationProps {
  savedData?: {
    name?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      province: string;
    };
    childrenAges?: string[];
    preferences?: {
      cooking?: boolean;
      specialNeeds?: boolean;
      montessori?: boolean;
      backupNanny?: boolean;
    };
  };
  savedAt?: Date;
}

export function ProfileSaveConfirmation({ savedData, savedAt }: ProfileSaveConfirmationProps) {
  if (!savedData) return null;

  const preferenceCount = savedData.preferences 
    ? Object.values(savedData.preferences).filter(Boolean).length 
    : 0;

  return (
    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 mb-6">
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      <AlertDescription className="ml-2">
        <div className="space-y-2">
          <p className="font-semibold text-green-900 dark:text-green-100">
            ✅ Profile saved successfully!
          </p>
          
          <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
            {savedData.name && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>Name: {savedData.name}</span>
              </div>
            )}
            
            {savedData.phone && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>Phone: {savedData.phone}</span>
              </div>
            )}
            
            {savedData.address && (savedData.address.street || savedData.address.city) && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  Address: {[savedData.address.street, savedData.address.city, savedData.address.province]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
            
            {savedData.childrenAges && savedData.childrenAges.length > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  Children: {savedData.childrenAges.length} (ages: {savedData.childrenAges.join(', ')})
                </span>
              </div>
            )}
            
            {preferenceCount > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>Preferences: {preferenceCount} selected</span>
              </div>
            )}
          </div>
          
          {savedAt && (
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300 mt-2">
              <Clock className="h-3 w-3" />
              <span>Last saved: {savedAt.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

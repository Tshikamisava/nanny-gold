import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

interface PermissionGateProps {
  children: React.ReactNode;
  permission: keyof ReturnType<typeof useAdminPermissions>['permissions'];
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  children, 
  permission, 
  fallback 
}) => {
  const { permissions, isSuperAdmin, loading } = useAdminPermissions();

  if (loading) {
    return <div className="flex items-center justify-center h-32">Loading...</div>;
  }

  // Super admin has access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check specific permission
  if (permissions[permission]) {
    return <>{children}</>;
  }

  // Show fallback or default message
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex items-center justify-center h-64">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium">Access Restricted</h3>
            <p className="text-muted-foreground">
              You don't have permission to access this section.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import React from 'react';
import { EnhancedAdminOverview } from '@/components/EnhancedAdminOverview';

export default function AdminOverview() {
  return (
    <div>
      <div className="mb-4 md:mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Overview</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Comprehensive dashboard with real-time platform metrics and insights
        </p>
      </div>
      
      <EnhancedAdminOverview />
    </div>
  );
}
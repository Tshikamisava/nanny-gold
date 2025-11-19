import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy dashboard components
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Loading skeletons for different dashboard types
const AdminOverviewSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex justify-between items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50">
    <div className="max-w-sm mx-auto">
      <div className="royal-gradient text-white p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-6 bg-white/20" />
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-32 bg-white/20" />
            <Skeleton className="h-4 w-40 bg-white/20" />
          </div>
          <Skeleton className="h-6 w-6 bg-white/20" />
        </div>
      </div>
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Wrapper components with suspense
export const LazyAdminOverview = () => (
  <Suspense fallback={<AdminOverviewSkeleton />}>
    <AdminOverview />
  </Suspense>
);

export const LazyAdminAnalytics = () => (
  <Suspense fallback={<AdminOverviewSkeleton />}>
    <AdminAnalytics />
  </Suspense>
);

export const LazyDashboard = () => (
  <Suspense fallback={<DashboardSkeleton />}>
    <Dashboard />
  </Suspense>
);
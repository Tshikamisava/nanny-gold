import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const BookingModificationHistory = lazy(() => 
  import('@/components/BookingModificationHistory').then(module => ({
    default: module.BookingModificationHistory
  }))
);

interface LazyBookingModificationHistoryProps {
  bookingId: string;
  className?: string;
}

export const LazyBookingModificationHistory = ({ bookingId, className }: LazyBookingModificationHistoryProps) => {
  return (
    <Suspense fallback={
      <div className={className}>
        <Skeleton className="h-16 w-full" />
      </div>
    }>
      <BookingModificationHistory bookingId={bookingId} />
    </Suspense>
  );
};
-- Performance optimization indexes for dashboard queries
-- These indexes will dramatically improve query performance

-- Index for nannies filtering by approval_status and availability
CREATE INDEX IF NOT EXISTS idx_nannies_status_available 
ON nannies(approval_status, is_available);

-- Index for bookings by client with status
CREATE INDEX IF NOT EXISTS idx_bookings_client_status 
ON bookings(client_id, status);

-- Index for bookings by nanny with status  
CREATE INDEX IF NOT EXISTS idx_bookings_nanny_status 
ON bookings(nanny_id, status);

-- Index for bookings by start date (for today's bookings queries)
CREATE INDEX IF NOT EXISTS idx_bookings_start_date 
ON bookings(start_date);

-- Index for support tickets by status
CREATE INDEX IF NOT EXISTS idx_support_tickets_status 
ON support_tickets(status);

-- Index for bookings by status and created_at for performance
CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
ON bookings(status, created_at DESC);

-- Composite index for common booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_composite 
ON bookings(client_id, status, start_date);

-- Index for faster total_monthly_cost aggregations
CREATE INDEX IF NOT EXISTS idx_bookings_cost_status 
ON bookings(status, total_monthly_cost) 
WHERE status = 'confirmed';
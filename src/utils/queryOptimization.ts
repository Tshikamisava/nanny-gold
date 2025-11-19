// Query optimization utilities for better database performance

export const QUERY_LIMITS = {
  DASHBOARD_STATS: 1000,
  BOOKINGS_RECENT: 50,
  ANALYTICS_RECENT: 100,
  SEARCH_RESULTS: 20,
} as const;

export const CACHE_TIMES = {
  DASHBOARD_STATS: 5 * 60 * 1000, // 5 minutes
  BOOKINGS: 2 * 60 * 1000, // 2 minutes  
  ANALYTICS: 10 * 60 * 1000, // 10 minutes
  SEARCH: 30 * 1000, // 30 seconds
} as const;

export const REFETCH_INTERVALS = {
  DASHBOARD_STATS: 30 * 1000, // 30 seconds
  BOOKINGS: 60 * 1000, // 1 minute
  ANALYTICS: 5 * 60 * 1000, // 5 minutes
  SEARCH: false, // No auto-refetch
} as const;

// Optimized query selectors to reduce data transfer
export const QUERY_SELECTORS = {
  BOOKING_LIST: `
    id,
    status,
    start_date,
    end_date,
    booking_type,
    total_monthly_cost,
    created_at,
    nannies:nanny_id (
      id,
      profiles:id (
        first_name,
        last_name
      )
    ),
    clients:client_id (
      id,
      home_size
    )
  `,
  
  NANNY_LIST: `
    id,
    hourly_rate,
    monthly_rate,
    rating,
    is_available,
    approval_status,
    profiles:id (
      first_name,
      last_name,
      location
    )
  `,
  
  CLIENT_LIST: `
    id,
    number_of_children,
    home_size,
    profiles:id (
      first_name,
      last_name,
      location
    )
  `
} as const;

// Database index suggestions for common queries
export const INDEX_SUGGESTIONS = [
  'CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON bookings(client_id, status);',
  'CREATE INDEX IF NOT EXISTS idx_bookings_nanny_status ON bookings(nanny_id, status);',
  'CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);',
  'CREATE INDEX IF NOT EXISTS idx_nannies_status_available ON nannies(approval_status, is_available);',
  'CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);',
] as const;
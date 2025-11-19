// Test scenario categories and data structures for Phase 7 Booking Flow Tests
export interface TestScenario {
  id: string;
  name: string;
  category: 'short-term' | 'long-term' | 'commission' | 'referral' | 'flow' | 'analytics';
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warning';
  message: string;
  expectedValue?: number;
  actualValue?: number;
  details?: string;
}

export interface PricingTestResult {
  passed: boolean;
  expected: number;
  actual: number;
  variance: number;
  details: string;
}

// Short-term test scenarios
export const shortTermScenarios: Omit<TestScenario, 'status' | 'message'>[] = [
  // Emergency Bookings
  { id: 'emergency-weekday', name: 'Emergency - Weekday (R80/hr)', category: 'short-term' },
  { id: 'emergency-weekend', name: 'Emergency - Weekend (R80/hr)', category: 'short-term' },
  { id: 'emergency-with-cooking', name: 'Emergency + Cooking (R100/day)', category: 'short-term' },
  { id: 'emergency-4-children', name: 'Emergency with 4+ children', category: 'short-term' },
  
  // Date Night Bookings
  { id: 'date-night-weekday', name: 'Date Night - Weekday (R120/hr)', category: 'short-term' },
  { id: 'date-night-weekend', name: 'Date Night - Weekend (R120/hr)', category: 'short-term' },
  
  // Date Day Bookings
  { id: 'date-day-weekday', name: 'Date Day - Weekday (R40/hr)', category: 'short-term' },
  { id: 'date-day-weekend', name: 'Date Day - Weekend (R55/hr)', category: 'short-term' },
  
  // Gap Coverage / Temporary Support
  { id: 'gap-coverage-weekday', name: 'Gap Coverage - Weekday (R280/day)', category: 'short-term' },
  { id: 'gap-coverage-weekend', name: 'Gap Coverage - Weekend (R350/day)', category: 'short-term' },
  { id: 'gap-coverage-mixed-week', name: 'Gap Coverage - Mixed Week', category: 'short-term' },
  { id: 'temporary-support-service-fee-waived', name: 'Temp Support 5+ Days (Fee Waived)', category: 'short-term' },
  { id: 'housekeeping-rate-by-home-size', name: 'Light Housekeeping Rate Varies by Home', category: 'short-term' },
];

// Long-term test scenarios
export const longTermScenarios: Omit<TestScenario, 'status' | 'message'>[] = [
  // Pocket Palace
  { id: 'pocket-palace-live-in', name: 'Pocket Palace - Live-in (R4,000)', category: 'long-term' },
  { id: 'pocket-palace-live-out', name: 'Pocket Palace - Live-out (R4,800)', category: 'long-term' },
  
  // Family Hub
  { id: 'family-hub-live-in', name: 'Family Hub - Live-in (R6,000)', category: 'long-term' },
  { id: 'family-hub-live-out', name: 'Family Hub - Live-out (R6,800)', category: 'long-term' },
  
  // Grand Retreat
  { id: 'grand-retreat-live-in', name: 'Grand Retreat - Live-in (R7,000)', category: 'long-term' },
  { id: 'grand-retreat-live-out', name: 'Grand Retreat - Live-out (R7,800)', category: 'long-term' },
  
  // Epic Estates
  { id: 'epic-estates-live-in', name: 'Epic Estates - Live-in (R10,000)', category: 'long-term' },
  { id: 'epic-estates-live-out', name: 'Epic Estates - Live-out (R11,000)', category: 'long-term' },
  
  // Complex scenarios
  { id: 'all-services-combo', name: 'All Additional Services Combined', category: 'long-term' },
  { id: '4-children-scenario', name: '4+ Children Scenario', category: 'long-term' },
  { id: '3-other-dependents', name: '3+ Other Dependents', category: 'long-term' },
  
  // Placement fee tests - ENHANCED
  { id: 'placement-fee-flat-2500', name: 'Flat R2,500 Placement Fee (Pocket/Family/Grand)', category: 'long-term' },
  { id: 'placement-fee-premium', name: 'Premium Estate Placement Fee 50% (Epic/Monumental)', category: 'long-term' },
];

// Commission test scenarios
export const commissionScenarios: Omit<TestScenario, 'status' | 'message'>[] = [
  { id: 'commission-tier-1', name: 'Budget Tier: ≤R5,000 (10%)', category: 'commission' },
  { id: 'commission-tier-2', name: 'Standard Tier: R5,001-R9,999 (15%)', category: 'commission' },
  { id: 'commission-tier-3', name: 'Premium Tier: ≥R10,000 (25%)', category: 'commission' },
  { id: 'nanny-earnings-accuracy', name: 'Nanny Earnings = Total - Commission', category: 'commission' },
  { id: 'payment-advice-generation', name: 'Payment Advice Accuracy', category: 'commission' },
];

// Referral test scenarios
export const referralScenarios: Omit<TestScenario, 'status' | 'message'>[] = [
  { id: 'new-client-referral', name: 'New Client Uses Referral Code', category: 'referral' },
  { id: 'referral-discount-applied', name: 'Referral Discount Applied to Client', category: 'referral' },
  { id: 'referrer-wallet-reward', name: 'Referrer Wallet Reward Added', category: 'referral' },
  { id: 'client-to-client-referral', name: 'Client-to-Client Referral', category: 'referral' },
  { id: 'nanny-referral', name: 'Nanny Referral (if applicable)', category: 'referral' },
  { id: 'invalid-referral-code', name: 'Invalid Referral Code Handling', category: 'referral' },
];

// Flow integration test scenarios
export const flowScenarios: Omit<TestScenario, 'status' | 'message'>[] = [
  { id: 'client-signup-to-booking', name: 'Client: Sign-up → Profile → Booking', category: 'flow' },
  { id: 'interview-to-approval', name: 'Interview → Admin Approval → Booking Active', category: 'flow' },
  { id: 'admin-dashboard-visibility', name: 'Admin Dashboard Shows All Booking Data', category: 'flow' },
  { id: 'nanny-dashboard-details', name: 'Nanny Sees Full Client & Booking Details', category: 'flow' },
  { id: 'client-dashboard-updates', name: 'Client Dashboard Real-time Updates', category: 'flow' },
];

// Analytics test scenarios
export const analyticsScenarios: Omit<TestScenario, 'status' | 'message'>[] = [
  { id: 'revenue-tracking', name: 'Total Revenue Matches booking_financials', category: 'analytics' },
  { id: 'active-bookings-count', name: 'Active Bookings Count Accurate', category: 'analytics' },
  { id: 'commission-totals', name: 'Commission Totals Match Database', category: 'analytics' },
  { id: 'nanny-earnings-totals', name: 'Nanny Earnings Totals Accurate', category: 'analytics' },
  { id: 'data-persistence', name: 'Data Persists Across Dashboards', category: 'analytics' },
  { id: 'realtime-updates', name: 'Real-time Updates via Subscriptions', category: 'analytics' },
];

export const allScenarios = [
  ...shortTermScenarios,
  ...longTermScenarios,
  ...commissionScenarios,
  ...referralScenarios,
  ...flowScenarios,
  ...analyticsScenarios,
];

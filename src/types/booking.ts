// Shared booking types to prevent circular dependencies

export interface UserPreferences {
  location: string;
  streetAddress?: string;
  estateInfo?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  numberOfChildren?: number;
  childrenAges: string[];
  otherDependents?: number;
  petsInHome?: string;
  homeSize?: string;
  specialNeeds: boolean;
  ecdTraining: boolean;
  drivingSupport: boolean;
  cooking: boolean;
  languages: string;
  personalityValues?: string[];
  childcareFocusAreas?: string[];
  childcareSupport?: string[];
  householdSupport?: string[];
  additionalNeeds?: string;
  montessori: boolean;
  schedule: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  backupNanny: boolean;
  livingArrangement?: string;
  durationType?: 'short_term' | 'long_term';
  bookingSubType?: 'date_night' | 'short_term' | 'school_holiday' | 'date_day' | 'emergency' | 'temporary_support';
  selectedDates?: string[];
  timeSlots?: Array<{ start: string; end: string }>;
  startTime?: string;
  breakPreference?: string;
  customBreakArrangement?: string;
  drivingRequired?: boolean;
  serviceSelections?: {
    lightHousekeeping: boolean;
    diverseAbilitySupport: boolean;
    cooking: boolean;
  };
  lightHousekeeping?: boolean;
}

export interface PricingBreakdown {
  baseRate: number;
  addOns: Array<{ name: string; price: number }>;
  total: number;
  isHourly?: boolean;
  totalHours?: number;
  subtotal?: number;
  serviceFee?: number;
  effectiveHourlyRate?: number;
}

/**
 * Booking Financial Details
 * Note: When querying with Supabase's nested select, booking_financials is returned as an array
 * even though it's a one-to-one relationship. Always access as booking_financials?.[0]
 */
export interface BookingFinancials {
  admin_total_revenue: number;
  nanny_earnings: number;
  commission_amount?: number;
  commission_percent?: number;
  fixed_fee?: number;
}

/**
 * Booking with nested relations from Supabase
 * Note: Supabase returns one-to-one relations as arrays when using nested select
 */
export interface BookingWithRelations {
  id: string;
  booking_type: string;
  status: string;
  start_date: string;
  end_date?: string;
  total_monthly_cost: number;
  created_at: string;
  client_id: string;
  nanny_id: string;
  clients?: {
    id?: string;
    home_size?: string;
    number_of_children?: number;
    children_ages?: string[];
    profiles?: {
      first_name: string;
      last_name: string;
      email?: string;
      phone?: string;
      location?: string;
    };
  };
  nannies?: {
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
  /** 
   * Supabase returns this as an array even though it's a one-to-one relationship
   * Access as: booking_financials?.[0]?.nanny_earnings
   */
  booking_financials?: BookingFinancials[];
  payment_proofs?: Array<{
    id: string;
    proof_url: string;
    payment_reference: string;
    payment_method: string;
    verification_status: string;
    amount: number;
    created_at: string;
    admin_notes: string | null;
  }>;
}

export interface BookingContextType {
  preferences: UserPreferences;
  selectedNanny: any | null;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setSelectedNanny: (nanny: any) => void;
  calculatePricing: () => PricingBreakdown;
  calculateNannySpecificPricing: (nanny: any) => PricingBreakdown;
  createBooking: (nannyId: string) => Promise<any>;
  isCreatingBooking: boolean;
  saveProfileToDatabase: () => Promise<void>;
  loadProfileFromDatabase: () => Promise<void>;
  isLoadingProfile: boolean;
}
/**
 * Centralized Nanny Options
 * All available options for nanny profiles and admin management
 */

// Service Categories (grouped for better UI organization)
export const SERVICE_CATEGORIES_GROUPED = {
  LONG_TERM: [
    { value: 'long_term', label: 'Long-Term Support' },
    { value: 'live_in', label: 'Live-In Available' },
    { value: 'live_out', label: 'Live-Out Available' },
  ],
  SHORT_TERM: [
    { value: 'emergency', label: 'Emergency (5AM-7AM)' },
    { value: 'date_night', label: 'Date Night' },
    { value: 'date_day', label: 'Day Care' },
    { value: 'school_holiday', label: 'School Holiday' },
    { value: 'temporary_support', label: 'Gap Coverage (5+ days)' },
  ],
};

// Keep flat array for backwards compatibility
export const SERVICE_CATEGORIES = [
  ...SERVICE_CATEGORIES_GROUPED.LONG_TERM,
  ...SERVICE_CATEGORIES_GROUPED.SHORT_TERM,
] as const;

// Admin Assigned Categories (premium tiers)
export const ADMIN_CATEGORIES = [
  { value: 'Premium', label: 'Premium' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Featured', label: 'Featured' },
] as const;

// Languages (comprehensive list for South African context)
export const AVAILABLE_LANGUAGES = [
  'English',
  'Afrikaans',
  'Zulu',
  'Xhosa',
  'Sotho',
  'Tswana',
  'Venda',
  'Tsonga',
  'Ndebele',
  'Swati',
  'Swahili',
  'French',
  'Portuguese',
  'German',
] as const;

// Skills (comprehensive childcare and household skills)
export const AVAILABLE_SKILLS = [
  'Childcare',
  'First Aid',
  'Early Childhood Development',
  'Homework Assistance',
  'Meal Preparation',
  'Baking',
  'Potty Training',
  'Sleep Training',
  'Educational Activities',
  'Arts & Crafts',
  'Music & Dance',
  'Sports & Exercise',
  'Swimming',
  'Pet Care',
  'Pet Savvy',
  'Light Housekeeping',
  'Laundry',
  'Clothing Repairs / Sewing',
  'Driving',
  'Diverse Ability Care',
  'Elderly Care',
  'Newborn Care',
  'Toddler Care',
  'Cooking',
] as const;

// Certifications
export const AVAILABLE_CERTIFICATIONS = [
  'First Aid',
  'CPR',
  'ECD (Early Childhood Development)',
  'Montessori',
  'Special Needs Care',
  'Nursing Qualification',
  'Childcare Diploma',
  'Food Safety',
  'Driving License',
  'Swimming Instructor',
  'Teacher Qualification',
] as const;

// Experience Levels
export const EXPERIENCE_LEVELS = [
  { value: '0-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10+', label: '10+ years' },
] as const;

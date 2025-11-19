// DEPLOYMENT_ID: PERMANENT_FIX_2025_01_27_v3_FINAL
// CRITICAL: This version uses manual financial calculations only
// Database function mismatch resolved via new 5-parameter overload
// Production edge functions will use the database function
// Test generation uses inline calculations for consistency
// Last updated: 2025-01-27 23:15:00 UTC
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Unique deployment marker for cache busting
    const DEPLOYMENT_MARKER = 'PERMANENT_FIX_v3_FINAL_2025_01_27';
    console.log('🚀 Test booking generation starting...', DEPLOYMENT_MARKER);
    console.log('📊 Target: 43 comprehensive test scenarios');

    console.log('Starting test booking generation...');

    // Step 1: Create or get test client profile
    const testClientEmail = `test-client-${Date.now()}@nannygold.test`;
    let testClientId: string;

    const { data: existingClientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', testClientEmail)
      .single();

    if (existingClientProfile) {
      testClientId = existingClientProfile.id;
      console.log('Using existing test client:', testClientId);
    } else {
      // Create test client auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testClientEmail,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'Client',
          user_type: 'client',
        },
      });

      if (authError) throw authError;
      testClientId = authData.user.id;

      // Wait for trigger to create profile and client record
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update client with custom test values
      await supabase
        .from('clients')
        .update({
          number_of_children: 2,
          children_ages: ['3-5', '6-10'],
          home_size: 'family_hub',
          other_dependents: 0,
        })
        .eq('id', testClientId);

      console.log('Created new test client:', testClientId);
    }

    // Step 2: Create or get test nanny profile
    const testNannyEmail = `test-nanny-${Date.now()}@nannygold.test`;
    let testNannyId: string;

    const { data: existingNannyProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', testNannyEmail)
      .single();

    if (existingNannyProfile) {
      testNannyId = existingNannyProfile.id;
      console.log('Using existing test nanny:', testNannyId);
    } else {
      // Create test nanny auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testNannyEmail,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'Nanny',
          user_type: 'nanny',
        },
      });

      if (authError) throw authError;
      testNannyId = authData.user.id;

      // Wait for trigger to create profile and nanny record
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update nanny with custom test values
      await supabase
        .from('nannies')
        .update({
          hourly_rate: 80,
          monthly_rate: 5000,
          experience_level: '4-7',
          is_available: true,
          approval_status: 'approved',
          can_receive_bookings: true,
          service_categories: ['long_term', 'short_term'],
        })
        .eq('id', testNannyId);

      console.log('Created new test nanny:', testNannyId);
    }

    // Step 3: Define all 43 test scenarios
    const testScenarios = [
      // Short-term: Emergency (4 scenarios)
      {
        id: 'emergency-weekday',
        booking_type: 'emergency',
        base_rate: 80,
        start_date: '2025-02-01',
        end_date: '2025-02-01',
        services: {
          bookingSubType: 'emergency',
          test_data: true,
          test_scenario_id: 'emergency-weekday',
          timeSlots: [{ start: '08:00', end: '17:00' }],
        },
        total_monthly_cost: 720, // 9 hours * 80
      },
      {
        id: 'emergency-weekend',
        booking_type: 'emergency',
        base_rate: 80,
        start_date: '2025-02-08',
        end_date: '2025-02-08',
        services: {
          bookingSubType: 'emergency',
          test_data: true,
          test_scenario_id: 'emergency-weekend',
          timeSlots: [{ start: '10:00', end: '18:00' }],
        },
        total_monthly_cost: 640,
      },
      {
        id: 'emergency-with-cooking',
        booking_type: 'emergency',
        base_rate: 80,
        start_date: '2025-02-03',
        end_date: '2025-02-03',
        services: {
          bookingSubType: 'emergency',
          test_data: true,
          test_scenario_id: 'emergency-with-cooking',
          cooking: true,
          timeSlots: [{ start: '09:00', end: '17:00' }],
        },
        total_monthly_cost: 720, // 8 hours * 80 + cooking addon
      },
      {
        id: 'emergency-4plus-children',
        booking_type: 'emergency',
        base_rate: 100, // Higher rate for 4+ children
        start_date: '2025-02-05',
        end_date: '2025-02-05',
        services: {
          bookingSubType: 'emergency',
          test_data: true,
          test_scenario_id: 'emergency-4plus-children',
          numberOfChildren: 4,
          timeSlots: [{ start: '08:00', end: '16:00' }],
        },
        total_monthly_cost: 800,
      },

      // Short-term: Date Night (2 scenarios)
      {
        id: 'date-night-weekday',
        booking_type: 'date_night',
        base_rate: 120,
        start_date: '2025-02-06',
        end_date: '2025-02-06',
        services: {
          bookingSubType: 'date_night',
          test_data: true,
          test_scenario_id: 'date-night-weekday',
          timeSlots: [{ start: '18:00', end: '23:00' }],
        },
        total_monthly_cost: 600, // 5 hours * 120
      },
      {
        id: 'date-night-weekend',
        booking_type: 'date_night',
        base_rate: 120,
        start_date: '2025-02-08',
        end_date: '2025-02-08',
        services: {
          bookingSubType: 'date_night',
          test_data: true,
          test_scenario_id: 'date-night-weekend',
          timeSlots: [{ start: '19:00', end: '00:00' }],
        },
        total_monthly_cost: 600,
      },

      // Short-term: Date Day (2 scenarios)
      {
        id: 'date-day-weekday',
        booking_type: 'date_day',
        base_rate: 100,
        start_date: '2025-02-10',
        end_date: '2025-02-10',
        services: {
          bookingSubType: 'date_day',
          test_data: true,
          test_scenario_id: 'date-day-weekday',
          timeSlots: [{ start: '10:00', end: '16:00' }],
        },
        total_monthly_cost: 600,
      },
      {
        id: 'date-day-weekend',
        booking_type: 'date_day',
        base_rate: 100,
        start_date: '2025-02-09',
        end_date: '2025-02-09',
        services: {
          bookingSubType: 'date_day',
          test_data: true,
          test_scenario_id: 'date-day-weekend',
          timeSlots: [{ start: '11:00', end: '17:00' }],
        },
        total_monthly_cost: 600,
      },

      // Short-term: Temporary Support (5 scenarios)
      {
        id: 'temporary-support-gap',
        booking_type: 'date_day',
        base_rate: 350,
        start_date: '2025-02-10',
        end_date: '2025-02-14',
        services: {
          bookingSubType: 'temporary_support',
          test_data: true,
          test_scenario_id: 'temporary-support-gap',
        },
        total_monthly_cost: 1750, // 5 days * 350
      },
      {
        id: 'temporary-support-pocket-housekeeping',
        booking_type: 'date_day',
        base_rate: 350,
        start_date: '2025-02-17',
        end_date: '2025-02-21',
        services: {
          bookingSubType: 'temporary_support',
          test_data: true,
          test_scenario_id: 'temporary-support-pocket-housekeeping',
          lightHousekeeping: true,
          homeSize: 'pocket_palace',
        },
        total_monthly_cost: 2000, // 5 days * 350 + housekeeping
      },
      {
        id: 'temporary-support-family-housekeeping',
        booking_type: 'date_day',
        base_rate: 350,
        start_date: '2025-02-24',
        end_date: '2025-02-28',
        services: {
          bookingSubType: 'temporary_support',
          test_data: true,
          test_scenario_id: 'temporary-support-family-housekeeping',
          lightHousekeeping: true,
          homeSize: 'family_hub',
        },
        total_monthly_cost: 2125, // Housekeeping for family_hub
      },
      {
        id: 'temporary-support-grand-housekeeping',
        booking_type: 'date_day',
        base_rate: 350,
        start_date: '2025-03-03',
        end_date: '2025-03-07',
        services: {
          bookingSubType: 'temporary_support',
          test_data: true,
          test_scenario_id: 'temporary-support-grand-housekeeping',
          lightHousekeeping: true,
          homeSize: 'grand_retreat',
        },
        total_monthly_cost: 2250,
      },
      {
        id: 'temporary-support-epic-housekeeping',
        booking_type: 'date_day',
        base_rate: 350,
        start_date: '2025-03-10',
        end_date: '2025-03-14',
        services: {
          bookingSubType: 'temporary_support',
          test_data: true,
          test_scenario_id: 'temporary-support-epic-housekeeping',
          lightHousekeeping: true,
          homeSize: 'epic_estates',
        },
        total_monthly_cost: 2500,
      },

      // Long-term: Base Scenarios (8 scenarios)
      {
        id: 'pocket-palace-live-in',
        booking_type: 'long_term',
        base_rate: 4000,
        start_date: '2025-03-01',
        end_date: '2026-02-28',
        home_size: 'pocket_palace',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'pocket-palace-live-in',
        },
        total_monthly_cost: 4000,
      },
      {
        id: 'pocket-palace-live-out',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2025-03-15',
        end_date: '2026-03-14',
        home_size: 'pocket_palace',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'pocket-palace-live-out',
        },
        total_monthly_cost: 5000,
      },
      {
        id: 'family-hub-live-in',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2025-04-01',
        end_date: '2026-03-31',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'family-hub-live-in',
        },
        total_monthly_cost: 5000,
      },
      {
        id: 'family-hub-live-out',
        booking_type: 'long_term',
        base_rate: 6500,
        start_date: '2025-04-15',
        end_date: '2026-04-14',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'family-hub-live-out',
        },
        total_monthly_cost: 6500,
      },
      {
        id: 'grand-retreat-live-in',
        booking_type: 'long_term',
        base_rate: 7000,
        start_date: '2025-05-01',
        end_date: '2026-04-30',
        home_size: 'grand_retreat',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'grand-retreat-live-in',
        },
        total_monthly_cost: 7000,
      },
      {
        id: 'grand-retreat-live-out',
        booking_type: 'long_term',
        base_rate: 9000,
        start_date: '2025-05-15',
        end_date: '2026-05-14',
        home_size: 'grand_retreat',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'grand-retreat-live-out',
        },
        total_monthly_cost: 9000,
      },
      {
        id: 'epic-estates-live-in',
        booking_type: 'long_term',
        base_rate: 9000,
        start_date: '2025-06-01',
        end_date: '2026-05-31',
        home_size: 'epic_estates',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'epic-estates-live-in',
        },
        total_monthly_cost: 9000,
      },
      {
        id: 'epic-estates-live-out',
        booking_type: 'long_term',
        base_rate: 11000,
        start_date: '2025-06-15',
        end_date: '2026-06-14',
        home_size: 'epic_estates',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'epic-estates-live-out',
        },
        total_monthly_cost: 11000,
      },

      // Long-term: Complex scenarios (5 scenarios)
      {
        id: 'long-term-all-services',
        booking_type: 'long_term',
        base_rate: 6500,
        start_date: '2025-07-01',
        end_date: '2026-06-30',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'long-term-all-services',
          cooking: true,
          specialNeeds: true,
          drivingSupport: true,
          petCare: true,
          ecdTraining: true,
          montessori: true,
        },
        total_monthly_cost: 9500, // Base + all add-ons
      },
      {
        id: 'long-term-4plus-children',
        booking_type: 'long_term',
        base_rate: 7500, // Base + 2 extra children (1000 each)
        start_date: '2025-07-15',
        end_date: '2026-07-14',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'long-term-4plus-children',
          numberOfChildren: 4,
        },
        total_monthly_cost: 7500,
      },
      {
        id: 'long-term-3plus-dependents',
        booking_type: 'long_term',
        base_rate: 7500, // Base + 3 dependents (500 each)
        start_date: '2025-08-01',
        end_date: '2026-07-31',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'long-term-3plus-dependents',
          otherDependents: 3,
        },
        total_monthly_cost: 8000,
      },

      // Placement fee scenarios (2 scenarios)
      {
        id: 'placement-fee-pocket',
        booking_type: 'long_term',
        base_rate: 4000,
        start_date: '2025-08-15',
        end_date: '2026-08-14',
        home_size: 'pocket_palace',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'placement-fee-pocket',
        },
        total_monthly_cost: 4000,
        placement_fee: 2500, // Expected placement fee
      },
      {
        id: 'placement-fee-epic',
        booking_type: 'long_term',
        base_rate: 11000,
        start_date: '2025-09-01',
        end_date: '2026-08-31',
        home_size: 'epic_estates',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'placement-fee-epic',
        },
        total_monthly_cost: 11000,
        placement_fee: 5500, // 50% of monthly rate
      },

      // Commission tier scenarios (5 scenarios)
      {
        id: 'commission-tier-1',
        booking_type: 'long_term',
        base_rate: 4000,
        start_date: '2025-09-15',
        end_date: '2026-09-14',
        home_size: 'pocket_palace',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'commission-tier-1',
        },
        total_monthly_cost: 4000, // 10% commission tier
      },
      {
        id: 'commission-tier-2',
        booking_type: 'long_term',
        base_rate: 6500,
        start_date: '2025-10-01',
        end_date: '2026-09-30',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'commission-tier-2',
        },
        total_monthly_cost: 6500, // 15% commission tier
      },
      {
        id: 'commission-tier-3',
        booking_type: 'long_term',
        base_rate: 11000,
        start_date: '2025-10-15',
        end_date: '2026-10-14',
        home_size: 'epic_estates',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'commission-tier-3',
        },
        total_monthly_cost: 11000, // 25% commission tier
      },
      {
        id: 'commission-short-term-low',
        booking_type: 'date_night',
        base_rate: 120,
        start_date: '2025-02-15',
        end_date: '2025-02-15',
        services: {
          bookingSubType: 'date_night',
          test_data: true,
          test_scenario_id: 'commission-short-term-low',
          timeSlots: [{ start: '18:00', end: '23:00' }],
        },
        total_monthly_cost: 600, // Low amount for commission
      },
      {
        id: 'commission-short-term-high',
        booking_type: 'date_day',
        base_rate: 350,
        start_date: '2025-03-17',
        end_date: '2025-03-31',
        services: {
          bookingSubType: 'temporary_support',
          test_data: true,
          test_scenario_id: 'commission-short-term-high',
        },
        total_monthly_cost: 5250, // 15 days * 350
      },

      // Referral scenarios (6 scenarios) - simplified for now
      {
        id: 'referral-code-valid',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2025-11-01',
        end_date: '2026-10-31',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'referral-code-valid',
        },
        total_monthly_cost: 5000,
      },
      {
        id: 'referral-code-invalid',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2025-11-15',
        end_date: '2026-11-14',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'referral-code-invalid',
        },
        total_monthly_cost: 5000,
      },
      {
        id: 'referral-reward-applied',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2025-12-01',
        end_date: '2026-11-30',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'referral-reward-applied',
        },
        total_monthly_cost: 4500, // After reward
      },
      {
        id: 'referral-reward-tracking',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2025-12-15',
        end_date: '2026-12-14',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'referral-reward-tracking',
        },
        total_monthly_cost: 5000,
      },
      {
        id: 'referral-self-use',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'referral-self-use',
        },
        total_monthly_cost: 5000,
      },
      {
        id: 'referral-chain',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2026-01-15',
        end_date: '2027-01-14',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'referral-chain',
        },
        total_monthly_cost: 5000,
      },

      // Flow scenarios (5 scenarios) - integration tests
      {
        id: 'flow-complete-booking',
        booking_type: 'long_term',
        base_rate: 6500,
        start_date: '2026-02-01',
        end_date: '2027-01-31',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'flow-complete-booking',
        },
        total_monthly_cost: 6500,
        status: 'confirmed',
      },
      {
        id: 'flow-booking-modification',
        booking_type: 'long_term',
        base_rate: 6500,
        start_date: '2026-02-15',
        end_date: '2027-02-14',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'flow-booking-modification',
        },
        total_monthly_cost: 6500,
      },
      {
        id: 'flow-booking-cancellation',
        booking_type: 'date_night',
        base_rate: 120,
        start_date: '2025-02-20',
        end_date: '2025-02-20',
        services: {
          bookingSubType: 'date_night',
          test_data: true,
          test_scenario_id: 'flow-booking-cancellation',
          timeSlots: [{ start: '19:00', end: '23:00' }],
        },
        total_monthly_cost: 480,
      },
      {
        id: 'flow-invoice-generation',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2026-03-01',
        end_date: '2027-02-28',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'flow-invoice-generation',
        },
        total_monthly_cost: 5000,
      },
      {
        id: 'flow-payment-processing',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2026-03-15',
        end_date: '2027-03-14',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'flow-payment-processing',
        },
        total_monthly_cost: 5000,
      },

      // Analytics scenarios (6 scenarios)
      {
        id: 'analytics-revenue-calculation',
        booking_type: 'long_term',
        base_rate: 7000,
        start_date: '2026-04-01',
        end_date: '2027-03-31',
        home_size: 'grand_retreat',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'analytics-revenue-calculation',
        },
        total_monthly_cost: 7000,
        status: 'confirmed',
      },
      {
        id: 'analytics-commission-breakdown',
        booking_type: 'long_term',
        base_rate: 9000,
        start_date: '2026-04-15',
        end_date: '2027-04-14',
        home_size: 'grand_retreat',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'analytics-commission-breakdown',
        },
        total_monthly_cost: 9000,
        status: 'confirmed',
      },
      {
        id: 'analytics-booking-count',
        booking_type: 'date_night',
        base_rate: 120,
        start_date: '2025-02-22',
        end_date: '2025-02-22',
        services: {
          bookingSubType: 'date_night',
          test_data: true,
          test_scenario_id: 'analytics-booking-count',
          timeSlots: [{ start: '20:00', end: '23:00' }],
        },
        total_monthly_cost: 360,
        status: 'confirmed',
      },
      {
        id: 'analytics-nanny-earnings',
        booking_type: 'long_term',
        base_rate: 11000,
        start_date: '2026-05-01',
        end_date: '2027-04-30',
        home_size: 'epic_estates',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'analytics-nanny-earnings',
        },
        total_monthly_cost: 11000,
        status: 'confirmed',
      },
      {
        id: 'analytics-client-spending',
        booking_type: 'long_term',
        base_rate: 6500,
        start_date: '2026-05-15',
        end_date: '2027-05-14',
        home_size: 'family_hub',
        living_arrangement: 'live-out',
        services: {
          test_data: true,
          test_scenario_id: 'analytics-client-spending',
        },
        total_monthly_cost: 6500,
        status: 'confirmed',
      },
      {
        id: 'analytics-monthly-recurring',
        booking_type: 'long_term',
        base_rate: 5000,
        start_date: '2026-06-01',
        end_date: '2027-05-31',
        home_size: 'family_hub',
        living_arrangement: 'live-in',
        services: {
          test_data: true,
          test_scenario_id: 'analytics-monthly-recurring',
        },
        total_monthly_cost: 5000,
        status: 'confirmed',
      },
    ];

    // Step 4: Create all test bookings
    const createdBookings: Record<string, string> = {};
    let successCount = 0;

    for (const scenario of testScenarios) {
      try {
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            client_id: testClientId,
            nanny_id: testNannyId,
            booking_type: scenario.booking_type,
            base_rate: scenario.base_rate,
            start_date: scenario.start_date,
            end_date: scenario.end_date,
            home_size: scenario.home_size || null,
            living_arrangement: scenario.living_arrangement || null,
            services: scenario.services,
            total_monthly_cost: scenario.total_monthly_cost,
            status: (scenario as any).status || 'pending',
          })
          .select()
          .single();

        if (bookingError) {
          console.error(`Failed to create booking ${scenario.id}:`, bookingError);
          continue;
        }

        createdBookings[scenario.id] = booking.id;

        // Calculate and create booking financials
        // NOTE: Manual calculation used here for test data consistency
        // Production uses calculate_booking_revenue() database function
        const total = scenario.total_monthly_cost;
        let commissionPercent = 10;
        if (total > 10000) commissionPercent = 25;
        else if (total > 5000) commissionPercent = 15;

        const commissionAmount = total * (commissionPercent / 100);
        const placementFee = (scenario as any).placement_fee || 0;
        const nannyEarnings = total - commissionAmount;
        const adminRevenue = commissionAmount + placementFee;

        await supabase.from('booking_financials').insert({
          booking_id: booking.id,
          booking_type: scenario.booking_type,
          commission_percent: commissionPercent,
          commission_amount: commissionAmount,
          fixed_fee: placementFee,
          nanny_earnings: nannyEarnings,
          admin_total_revenue: adminRevenue,
        });

        successCount++;
        console.log(`✓ Created test booking: ${scenario.id}`);
      } catch (error) {
        console.error(`Error creating booking ${scenario.id}:`, error);
      }
    }

    console.log(`Test booking generation complete: ${successCount}/43 bookings created`);

    return new Response(
      JSON.stringify({
        success: true,
        bookings_created: successCount,
        total_scenarios: testScenarios.length,
        test_client_id: testClientId,
        test_nanny_id: testNannyId,
        scenario_mapping: createdBookings,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-test-bookings:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate test bookings'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

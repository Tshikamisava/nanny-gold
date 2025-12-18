import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://msawldkygbsipjmjuyue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYXdsZGt5Z2JzaXBqbWp1eXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ2NDksImV4cCI6MjA2NTM4MDY0OX0.iXx7rKVMscXBhkjI-G4NiDhnec9TSZXVr3ojyB3m8NQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fixSQL = `
-- Fix the calculate_booking_revenue function
CREATE OR REPLACE FUNCTION public.calculate_booking_revenue(
  p_booking_id uuid, 
  p_total_amount numeric, 
  p_booking_type text, 
  p_monthly_rate_estimate numeric DEFAULT NULL::numeric,
  p_home_size text DEFAULT NULL::text
)
RETURNS TABLE(
  fixed_fee numeric, 
  commission_percent numeric, 
  commission_amount numeric, 
  admin_total_revenue numeric, 
  nanny_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fixed_fee DECIMAL := 0;
  v_commission_percent DECIMAL := 0;
  v_commission_amount DECIMAL := 0;
  v_admin_total_revenue DECIMAL := 0;
  v_nanny_earnings DECIMAL := 0;
  v_monthly_rate DECIMAL := 0;
BEGIN
  v_monthly_rate := COALESCE(p_monthly_rate_estimate, p_total_amount);
  
  IF p_booking_type = 'long_term' THEN
    IF p_home_size IN ('Grand Retreat', 'Epic Estates') THEN
      v_fixed_fee := v_monthly_rate * 0.50;
    ELSE
      v_fixed_fee := 2500.00;
    END IF;
    
    IF v_monthly_rate >= 10000 THEN
      v_commission_percent := 25;
    ELSIF v_monthly_rate <= 5000 THEN
      v_commission_percent := 10;
    ELSE
      v_commission_percent := 15;
    END IF;
    
    v_commission_amount := v_monthly_rate * (v_commission_percent / 100);
    v_admin_total_revenue := v_fixed_fee + v_commission_amount;
    v_nanny_earnings := v_monthly_rate - v_commission_amount;
    
  ELSE
    DECLARE
      booking_days INTEGER := 1;
    BEGIN
      SELECT COALESCE(
        (SELECT DATE_PART('day', b.end_date - b.start_date) + 1 FROM public.bookings b WHERE b.id = p_booking_id),
        1
      ) INTO booking_days;
      
      v_fixed_fee := 35 * booking_days;
      v_commission_percent := 20;
      v_commission_amount := (p_total_amount - v_fixed_fee) * (v_commission_percent / 100);
      v_admin_total_revenue := v_fixed_fee + v_commission_amount;
      v_nanny_earnings := p_total_amount - v_fixed_fee - v_commission_amount;
    END;
  END IF;

  RETURN QUERY SELECT v_fixed_fee, v_commission_percent, v_commission_amount, v_admin_total_revenue, v_nanny_earnings;
END;
$function$;
`;

const recalculateSQL = `
DO $$
DECLARE
  booking_record RECORD;
  calc_result RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR booking_record IN 
    SELECT b.id, b.total_monthly_cost, b.booking_type, b.home_size 
    FROM bookings b
    WHERE EXISTS (SELECT 1 FROM booking_financials bf WHERE bf.booking_id = b.id)
  LOOP
    SELECT * INTO calc_result 
    FROM calculate_booking_revenue(
      booking_record.id,
      booking_record.total_monthly_cost,
      booking_record.booking_type,
      booking_record.total_monthly_cost,
      booking_record.home_size
    );
    
    UPDATE booking_financials
    SET 
      fixed_fee = calc_result.fixed_fee,
      commission_percent = calc_result.commission_percent,
      commission_amount = calc_result.commission_amount,
      admin_total_revenue = calc_result.admin_total_revenue,
      nanny_earnings = calc_result.nanny_earnings,
      updated_at = NOW()
    WHERE booking_id = booking_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Recalculated % booking financials', updated_count;
END $$;
`;

async function applyFix() {
  console.log('🔧 Applying fix to calculate_booking_revenue function...');
  
  // Step 1: Fix the function
  const { error: functionError } = await supabase.rpc('exec_sql', { sql: fixSQL }).catch(() => 
    supabase.from('_dummy').select('*').limit(0) // Fallback - we'll use direct SQL
  );
  
  // Try direct SQL execution
  try {
    const { error: err1 } = await supabase.rpc('exec', { query: fixSQL });
    if (err1) {
      console.log('⚠️  Cannot execute via RPC, manual SQL execution required');
      console.log('\n📋 Please run this SQL in Supabase Dashboard > SQL Editor:\n');
      console.log(fixSQL);
      console.log('\n' + recalculateSQL);
      console.log('\n💡 Or visit: https://supabase.com/dashboard/project/msawldkygbsipjmjuyue/sql/new');
      return;
    }
  } catch (e) {
    console.log('⚠️  Direct execution not available');
    console.log('\n📋 Manual steps required:\n');
    console.log('1. Open: https://supabase.com/dashboard/project/msawldkygbsipjmjuyue/sql/new');
    console.log('2. Copy contents of APPLY_FIX.sql');
    console.log('3. Paste and click Run');
    console.log('\n✅ This will fix all bookings with negative earnings');
    return;
  }
  
  console.log('✅ Function updated successfully');
  
  // Step 2: Recalculate existing bookings
  console.log('🔄 Recalculating booking financials...');
  const { error: recalcError } = await supabase.rpc('exec', { query: recalculateSQL });
  
  if (recalcError) {
    console.error('❌ Error recalculating:', recalcError);
  } else {
    console.log('✅ All booking financials recalculated');
  }
  
  // Step 3: Verify
  console.log('🔍 Verifying fix...');
  const { data, error } = await supabase
    .from('booking_financials')
    .select('nanny_earnings')
    .lt('nanny_earnings', 0);
  
  if (error) {
    console.error('❌ Error verifying:', error);
  } else {
    console.log(`✅ Bookings with negative earnings: ${data?.length || 0}`);
    if (data && data.length === 0) {
      console.log('🎉 SUCCESS! All bookings now have positive nanny earnings!');
    }
  }
}

applyFix().catch(console.error);

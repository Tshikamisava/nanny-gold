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

    console.log('Starting test booking cleanup...');

    // Step 1: Get all test booking IDs
    const { data: testBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('services->>test_data', 'true');

    const testBookingIds = testBookings?.map(b => b.id) || [];
    console.log(`Found ${testBookingIds.length} test bookings to delete`);

    // Step 2: Delete booking financials (cascade will handle this, but being explicit)
    const { error: financialsError } = await supabase
      .from('booking_financials')
      .delete()
      .in('booking_id', testBookingIds);

    if (financialsError) {
      console.error('Error deleting booking financials:', financialsError);
    } else {
      console.log('✓ Deleted booking financials');
    }

    // Step 3: Delete booking modifications
    const { error: modificationsError } = await supabase
      .from('booking_modifications')
      .delete()
      .in('booking_id', testBookingIds);

    if (modificationsError) {
      console.error('Error deleting booking modifications:', modificationsError);
    } else {
      console.log('✓ Deleted booking modifications');
    }

    // Step 4: Delete invoices
    const { error: invoicesError } = await supabase
      .from('invoices')
      .delete()
      .in('booking_id', testBookingIds);

    if (invoicesError) {
      console.error('Error deleting invoices:', invoicesError);
    } else {
      console.log('✓ Deleted invoices');
    }

    // Step 5: Delete test bookings
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('services->>test_data', 'true');

    if (bookingsError) {
      throw new Error(`Failed to delete bookings: ${bookingsError.message}`);
    }

    console.log('✓ Deleted test bookings');

    // Step 6: Get test profile IDs
    const { data: testProfiles } = await supabase
      .from('profiles')
      .select('id, user_type')
      .like('email', 'test-%@nannygold.test');

    const testClientId = testProfiles?.find(p => p.user_type === 'client')?.id;
    const testNannyId = testProfiles?.find(p => p.user_type === 'nanny')?.id;

    let deletedProfiles = 0;

    // Step 7: Delete test client profile
    if (testClientId) {
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', testClientId);

      if (clientError) {
        console.error('Error deleting client profile:', clientError);
      } else {
        console.log('✓ Deleted test client record');
      }
    }

    // Step 8: Delete test nanny profile
    if (testNannyId) {
      const { error: nannyError } = await supabase
        .from('nannies')
        .delete()
        .eq('id', testNannyId);

      if (nannyError) {
        console.error('Error deleting nanny profile:', nannyError);
      } else {
        console.log('✓ Deleted test nanny record');
      }
    }

    // Step 9: Delete profiles (will cascade delete auth users)
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .like('email', 'test-%@nannygold.test');

    if (profilesError) {
      console.error('Error deleting profiles:', profilesError);
    } else {
      console.log('✓ Deleted test profiles');
    }

    // Step 10: Delete auth users by listing and filtering
    try {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (!listError && users) {
        const testAuthUsers = users.filter(u => 
          u.email && u.email.startsWith('test-') && u.email.endsWith('@nannygold.test')
        );
        
        for (const user of testAuthUsers) {
          try {
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteError) {
              console.error(`Error deleting auth user ${user.email}:`, deleteError);
            } else {
              console.log(`✓ Deleted auth user: ${user.email}`);
              deletedProfiles++;
            }
          } catch (err) {
            console.error(`Exception deleting auth user ${user.email}:`, err);
          }
        }
      } else {
        console.error('Error listing auth users:', listError);
      }
    } catch (authError) {
      console.error('Error in auth user cleanup:', authError);
    }

    console.log('Test booking cleanup complete');

    return new Response(
      JSON.stringify({
        success: true,
        deleted_bookings: testBookingIds.length,
        deleted_profiles: deletedProfiles,
        message: `Successfully cleaned up ${testBookingIds.length} test bookings and ${deletedProfiles} test profiles`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in cleanup-test-bookings:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to cleanup test bookings'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

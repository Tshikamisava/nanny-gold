// Simple bucket check without authentication
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://msawldkygbsipjmjuyue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYXdsZGt5Z2JzaXBqbWp1eXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ2NDksImV4cCI6MjA2NTM4MDY0OX0.iXx7rKVMscXBhkjI-G4NiDhnec9TSZXVr3ojyB3m8NQ'
);

async function checkBuckets() {
  console.log('🔍 === SIMPLE BUCKET CHECK ===\n');
  
  try {
    // Just check if we can list buckets
    console.log('📦 Checking storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      console.log('🔍 Possible reasons:');
      console.log('   - Storage is not enabled for your project');
      console.log('   - Anon key doesn\'t have permission to list buckets');
      console.log('   - Network connectivity issues');
      return;
    }
    
    console.log('✅ Successfully connected to storage');
    console.log(`📊 Found ${buckets.length} buckets:`);
    
    if (buckets.length === 0) {
      console.log('⚠️ No buckets found!');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Open SQL Editor');
      console.log('3. Run the SQL script from create-buckets-manual.sql');
      console.log('4. Run each section separately, not all at once');
      console.log('');
      console.log('📋 First section to run:');
      console.log('INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)');
      console.log('VALUES (\'documents\', \'documents\', false, 52428800, ARRAY[\'image/jpeg\', \'image/png\', \'image/gif\', \'application/pdf\', \'text/plain\', \'application/msword\', \'application/vnd.openxmlformats-officedocument.wordprocessingml.document\']);');
      return;
    }
    
    // List all buckets
    buckets.forEach((bucket, index) => {
      console.log(`   ${index + 1}. ${bucket.name} (ID: ${bucket.id}, Public: ${bucket.public})`);
    });
    
    // Check for required buckets
    console.log('');
    console.log('🔍 Checking for required buckets:');
    
    const hasDocuments = buckets.some(b => b.name === 'document');
    const hasAvatars = buckets.some(b => b.name === 'avatars');
    
    if (hasDocuments) {
      console.log('✅ "document" bucket found');
    } else {
      console.log('❌ "document" bucket missing');
    }
    
    if (hasAvatars) {
      console.log('✅ "avatars" bucket found');
    } else {
      console.log('❌ "avatars" bucket missing');
    }
    
    if (hasDocuments && hasAvatars) {
      console.log('');
      console.log('🎉 All required buckets are present!');
      console.log('');
      console.log('🔍 If you still see errors in your app, the issue might be:');
      console.log('   - RLS (Row Level Security) policies');
      console.log('   - Authentication issues in the app');
      console.log('   - Browser cache (try refreshing)');
      console.log('   - CORS issues');
    } else {
      console.log('');
      console.log('🔧 Some buckets are missing. Run the SQL script to create them.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkBuckets();

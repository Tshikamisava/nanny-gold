// Debug storage with more details
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://msawldkygbsipjmjuyue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYXdsZGt5Z2JzaXBqbWp1eXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ2NDksImV4cCI6MjA2NTM4MDY0OX0.iXx7rKVMscXBhkjI-G4NiDhnec9TSZXVr3ojyB3m8NQ'
);

async function debugStorage() {
  console.log('🔍 === DEBUG STORAGE ACCESS ===\n');
  
  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    console.log('📊 Raw response:', { buckets, bucketError });
    
    if (bucketError) {
      console.error('❌ Error details:', {
        message: bucketError.message,
        status: bucketError.status,
        statusCode: bucketError.statusCode,
        error: bucketError.error
      });
      
      if (bucketError.statusCode === 403) {
        console.log('🔍 This is a permission issue - anon key might not have access to list buckets');
        console.log('💡 Try using a service role key or check RLS policies');
      }
    }
    
    if (buckets) {
      console.log(`✅ Found ${buckets.length} buckets`);
      buckets.forEach((bucket, index) => {
        console.log(`   ${index + 1}. ${bucket.name} (ID: ${bucket.id}, Public: ${bucket.public})`);
      });
    }
    
    // Test 2: Try to access a specific bucket directly
    console.log('\n2️⃣ Testing direct bucket access...');
    
    // Try common bucket names
    const bucketNames = ['documents', 'document', 'avatars', 'avatar', 'uploads', 'files'];
    
    for (const bucketName of bucketNames) {
      try {
        console.log(`🔍 Trying bucket: ${bucketName}`);
        
        // Try to list files (this will fail if bucket doesn't exist or no permission)
        const { data: files, error: fileError } = await supabase.storage
          .from(bucketName)
          .list();
        
        if (fileError) {
          console.log(`   ❌ ${bucketName}: ${fileError.message}`);
        } else {
          console.log(`   ✅ ${bucketName}: Access granted (${files.length} files)`);
        }
      } catch (err) {
        console.log(`   ❌ ${bucketName}: ${err.message}`);
      }
    }
    
    // Test 3: Check project info
    console.log('\n3️⃣ Testing project info...');
    try {
      const { data, error } = await supabase
        .from('_supabase')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌ Cannot access system tables:', error.message);
      } else {
        console.log('✅ Project connection working');
      }
    } catch (err) {
      console.log('❌ Project test failed:', err.message);
    }
    
    console.log('\n🎯 === DEBUG COMPLETE ===');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. If you see buckets in dashboard but not here, it\'s a permission issue');
    console.log('2. Check RLS policies on storage.buckets table');
    console.log('3. Try using service role key instead of anon key');
    console.log('4. Make sure storage is enabled for your project');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugStorage();

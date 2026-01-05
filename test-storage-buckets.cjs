// Test script to check storage buckets
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://msawldkygbsipjmjuyue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYXdsZGt5Z2JzaXBqbWp1eXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ2NDksImV4cCI6MjA2NTM4MDY0OX0.iXx7rKVMscXBhkjI-G4NiDhnec9TSZXVr3ojyB3m8NQ'
);

async function checkBuckets() {
  try {
    console.log('🔍 Checking storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }
    
    console.log('✅ Available buckets:', buckets);
    
    const documentsBucket = buckets.find(b => b.name === 'documents');
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    
    if (!documentsBucket) {
      console.error('❌ Documents bucket not found');
    } else {
      console.log('✅ Documents bucket found:', documentsBucket);
    }
    
    if (!avatarsBucket) {
      console.error('❌ Avatars bucket not found');
    } else {
      console.log('✅ Avatars bucket found:', avatarsBucket);
    }
    
    // Test upload permissions
    console.log('🧪 Testing upload permissions...');
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const testFileName = `test/${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testFile);
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      console.log('🔍 This might be due to RLS policies. Check if policies are correctly set up.');
    } else {
      console.log('✅ Upload test successful:', uploadData);
      // Clean up test file
      await supabase.storage.from('documents').remove([testFileName]);
      console.log('🧹 Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Storage test error:', error);
  }
}

checkBuckets();

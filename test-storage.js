// Test script to check storage bucket access
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://msawldkygbsipjmjuyue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYXdsZGt5Z2JzaXBqbWp1eXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ2NDksImV4cCI6MjA2NTM4MDY0OX0.iXx7rKVMscXBhkjI-G4NiDhnec9TSZXVr3ojyB3m8NQ'
);

async function testStorage() {
  try {
    console.log('🔍 Testing storage bucket access...');
    
    // List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }
    
    console.log('✅ Available buckets:', buckets);
    
    // Check if documents bucket exists
    const documentsBucket = buckets.find(b => b.name === 'documents');
    if (!documentsBucket) {
      console.error('❌ Documents bucket not found');
      return;
    }
    
    console.log('✅ Documents bucket found:', documentsBucket);
    
    // Test upload permissions
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const testFileName = `test/${Date.now()}.txt`;
    
    console.log('📤 Testing upload to:', testFileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testFile);
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return;
    }
    
    console.log('✅ Upload successful:', uploadData);
    
    // Clean up test file
    await supabase.storage
      .from('documents')
      .remove([testFileName]);
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testStorage();

// Test script to check storage bucket access
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

async function testStorage() {
  try {
    console.log('Testing storage bucket access...');
    
    // List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return;
    }
    
    console.log('Available buckets:', buckets);
    
    // Check if documents bucket exists
    const documentsBucket = buckets.find(b => b.name === 'documents');
    if (!documentsBucket) {
      console.error('Documents bucket not found');
      return;
    }
    
    console.log('Documents bucket found:', documentsBucket);
    
    // Test upload permissions
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const testFileName = `test/${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testFile);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }
    
    console.log('Upload successful:', uploadData);
    
    // Clean up test file
    await supabase.storage
      .from('documents')
      .remove([testFileName]);
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test error:', error);
  }
}

testStorage();

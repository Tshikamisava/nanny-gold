// Comprehensive storage diagnostic tool
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://msawldkygbsipjmjuyue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYXdsZGt5Z2JzaXBqbWp1eXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ2NDksImV4cCI6MjA2NTM4MDY0OX0.iXx7rKVMscXBhkjI-G4NiDhnec9TSZXVr3ojyB3m8NQ'
);

async function diagnoseStorage() {
  console.log('🔍 === COMPREHENSIVE STORAGE DIAGNOSTIC ===\n');
  
  try {
    // 1. Check authentication
    console.log('1️⃣ Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
      return;
    }
    
    if (!user) {
      console.log('❌ No authenticated user');
      return;
    }
    
    console.log('✅ Authenticated as:', user.id);
    console.log('✅ Email:', user.email);
    console.log('✅ User created at:', user.created_at);
    
    // 2. List all buckets with detailed info
    console.log('\n2️⃣ Listing all storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      console.log('🔍 This might indicate a permission issue or storage not enabled');
      return;
    }
    
    console.log('✅ Total buckets found:', buckets.length);
    
    if (buckets.length === 0) {
      console.log('⚠️ No buckets found. Storage buckets need to be created.');
      console.log('📋 Solution: Run the SQL script in create-buckets-manual.sql');
      return;
    }
    
    buckets.forEach((bucket, index) => {
      console.log(`📦 Bucket ${index + 1}:`);
      console.log(`   - ID: ${bucket.id}`);
      console.log(`   - Name: ${bucket.name}`);
      console.log(`   - Public: ${bucket.public}`);
      console.log(`   - Created: ${bucket.created_at}`);
      console.log(`   - Updated: ${bucket.updated_at}`);
      console.log('');
    });
    
    // 3. Check specifically for required buckets
    console.log('3️⃣ Checking for required buckets...');
    const documentsBucket = buckets.find(b => b.name === 'documents');
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    
    if (!documentsBucket) {
      console.log('❌ "documents" bucket not found');
    } else {
      console.log('✅ "documents" bucket found');
    }
    
    if (!avatarsBucket) {
      console.log('❌ "avatars" bucket not found');
    } else {
      console.log('✅ "avatars" bucket found');
    }
    
    // 4. Test bucket access with proper file types
    if (documentsBucket) {
      console.log('\n4️⃣ Testing documents bucket access...');
      
      // Test with a proper file type (PDF)
      const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n');
      const testFileName = `${user.id}/test-${Date.now()}.pdf`;
      
      console.log('📤 Testing PDF upload...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(testFileName, pdfContent, {
          contentType: 'application/pdf'
        });
      
      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        console.log('🔍 Error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        });
        
        if (uploadError.statusCode === '403') {
          console.log('🔍 This is likely a Row Level Security (RLS) policy issue');
          console.log('📋 Solution: Check RLS policies for the documents bucket');
        } else if (uploadError.statusCode === '400') {
          console.log('🔍 This might be a file type or size issue');
        }
      } else {
        console.log('✅ Upload successful:', uploadData);
        
        // Test download
        console.log('📥 Testing download...');
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(testFileName);
        
        if (downloadError) {
          console.error('❌ Download failed:', downloadError);
        } else {
          console.log('✅ Download successful, size:', downloadData.size);
        }
        
        // Clean up
        console.log('🧹 Cleaning up test file...');
        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove([testFileName]);
        
        if (deleteError) {
          console.error('❌ Cleanup failed:', deleteError);
        } else {
          console.log('✅ Test file cleaned up');
        }
      }
    }
    
    // 5. Check database tables
    console.log('\n5️⃣ Checking database tables...');
    
    // Check nanny_documents table
    const { data: tableInfo, error: tableError } = await supabase
      .from('nanny_documents')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Error accessing nanny_documents table:', tableError);
      console.log('🔍 This might indicate the table doesn\'t exist or RLS issues');
    } else {
      console.log('✅ nanny_documents table accessible');
    }
    
    // Check if user has nanny record
    const { data: nannyRecord, error: nannyError } = await supabase
      .from('nannies')
      .select('id, created_at')
      .eq('id', user.id)
      .single();
    
    if (nannyError) {
      console.log('⚠️ Nanny record not found:', nannyError.message);
      console.log('🔍 This will be created automatically when uploading documents');
    } else {
      console.log('✅ Nanny record found:', nannyRecord);
    }
    
    console.log('\n🎯 === DIAGNOSTIC COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

diagnoseStorage();

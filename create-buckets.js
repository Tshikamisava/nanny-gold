// Script to create storage buckets directly
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://msawldkygbsipjmjuyue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYXdsZGt5Z2JzaXBqbWp1eXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ2NDksImV4cCI6MjA2NTM4MDY0OX0.iXx7rKVMscXBhkjI-G4NiDhnec9TSZXVr3ojyB3m8NQ',
  {
    auth: {
      persistSession: false
    }
  }
);

async function createBuckets() {
  try {
    console.log('🔧 Creating storage buckets...');
    
    // Create documents bucket
    const { data: docsData, error: docsError } = await supabase.storage.createBucket('documents', {
      public: false,
      allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (docsError && !docsError.message.includes('already exists')) {
      console.error('❌ Error creating documents bucket:', docsError);
    } else {
      console.log('✅ Documents bucket created or already exists');
    }
    
    // Create avatars bucket
    const { data: avatarsData, error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (avatarsError && !avatarsError.message.includes('already exists')) {
      console.error('❌ Error creating avatars bucket:', avatarsError);
    } else {
      console.log('✅ Avatars bucket created or already exists');
    }
    
    // Test buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
    } else {
      console.log('✅ Available buckets:', buckets);
    }
    
    console.log('✅ Bucket creation completed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createBuckets();

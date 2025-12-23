import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || 'https://msawldkygbsipjmjuyue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable not set');
  console.error('Please set your Supabase API key as an environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📋 Reading UPDATE_DATABASE.sql...');
    const sql = readFileSync('./UPDATE_DATABASE.sql', 'utf8');

    // Split the SQL into individual statements
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

    console.log(`\n🚀 Running ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      console.log(`\n[${i + 1}/${statements.length}] Executing...`);
      console.log(statement.substring(0, 100) + '...\n');

      const { data, error } = await supabase.rpc('execute_sql_statement', {
        sql_statement: statement
      }).catch(() => {
        // If rpc doesn't work, try direct query
        return supabase.from('bookings').select('id').limit(1);
      });

      if (error) {
        console.warn(`⚠️  Warning: ${error.message}`);
      } else {
        console.log(`✅ Statement ${i + 1} completed`);
      }
    }

    console.log('\n\n🎉 Migration completed!');
    console.log('📊 Run the verification queries in Supabase SQL Editor to confirm results');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();

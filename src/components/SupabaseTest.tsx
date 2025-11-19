import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

const SupabaseTest = () => {
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection
        const { data, error } = await supabase.from('_supabase_test').select('*').limit(1)

        if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected for our test
          console.error('Supabase connection error:', error)
        } else {
          console.log('✅ Supabase connection successful!')
        }
      } catch (err) {
        console.error('❌ Supabase connection failed:', err)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4 bg-muted rounded-lg">
      <h3 className="font-semibold mb-2">Supabase Status</h3>
      <p className="text-sm text-muted-foreground">
        Check console for connection status. If working, you'll see "✅ Supabase connection successful!"
      </p>
    </div>
  )
}

export default SupabaseTest

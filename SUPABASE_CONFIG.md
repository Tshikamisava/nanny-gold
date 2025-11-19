# Supabase Configuration Guide

## Environment Variables (.env file)

Create a `.env` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your dashboard
3. Select your project (msawldkygbsipjmjuyue)
4. Go to Settings > API
5. Copy:
   - Project URL
   - anon/public key
   - service_role key (if needed)

## Client Configuration

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types (optional)
export type Database = {
  // Add your database types here
}
```

## Authentication Setup

Create `src/hooks/useAuth.ts`:

```typescript
import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    session,
    loading,
    signOut,
  }
}
```

## Authentication Provider

Create `src/components/AuthProvider.tsx`:

```typescript
import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

const AuthContext = createContext<ReturnType<typeof useAuth> | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
```

## Usage in App.tsx

```typescript
import { AuthProvider } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

function App() {
  return (
    <AuthProvider>
      {/* Your app routes */}
    </AuthProvider>
  )
}
```

## Database Types (Optional)

Create `src/types/database.ts`:

```typescript
export type Database = {
  public: {
    Tables: {
      // Define your tables here
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
    }
  }
}
```

## Environment Setup

1. Create `.env` file with your Supabase credentials
2. Add `.env` to `.gitignore` (already done)
3. Restart your development server
4. Test authentication flows

## Next Steps

1. Set up your database tables in Supabase dashboard
2. Configure Row Level Security (RLS) policies
3. Set up authentication providers (email, phone, etc.)
4. Configure storage buckets if needed
5. Set up real-time subscriptions for live updates

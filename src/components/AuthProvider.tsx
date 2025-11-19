import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 AuthProvider - Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔐 AuthProvider - Session fetched:', { hasSession: !!session, error: !!error });
        
        if (mounted) {
          if (error || !session) {
            console.log('🔐 AuthProvider - No valid session, setting null');
            setSession(null);
            setUser(null);
          } else {
            console.log('🔐 AuthProvider - Valid session found, user:', session.user.email);
            setSession(session);
            setUser(session.user);
            sessionStorage.setItem('auth_cache', JSON.stringify({
              user: session.user,
              timestamp: Date.now()
            }));
          }
          console.log('🔐 AuthProvider - Setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 AuthProvider - Auth state changed:', event, 'hasSession:', !!session);
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update cache
        if (session?.user) {
          sessionStorage.setItem('auth_cache', JSON.stringify({
            user: session.user,
            timestamp: Date.now()
          }));
        } else {
          sessionStorage.removeItem('auth_cache');
        }
      }
    );

    // Initialize authentication
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    return { error };
  };

  const signOut = async () => {
    // Clear development mode auth
    localStorage.removeItem('dev_authenticated');
    localStorage.removeItem('dev_user');
    localStorage.removeItem('dev_user_type');
    
    // Clear Supabase auth
    await supabase.auth.signOut();
    
    // Reset state
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
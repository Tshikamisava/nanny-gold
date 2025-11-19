/**
 * @deprecated This hook is deprecated. Use useAuthContext from @/components/AuthProvider instead.
 * This file will be removed in a future update to prevent authentication inconsistencies.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: userData
        }
      });
      
      // Handle anonymous auth disabled error
      if (error && error.message.includes('Anonymous sign ins are disabled')) {
        console.log('Anonymous auth disabled - this should not happen for email signup');
        return { 
          data: null, 
          error: new Error('Please check your Supabase authentication settings. Email signup should be enabled.') 
        };
      }
      
      return { data, error };

    } catch (err: any) {
      console.error('Signup error:', err);
      return { data: null, error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Check if input looks like a phone number
    const phoneRegex = /^(\+27|0)[0-9]{9}$/;
    const isPhoneNumber = phoneRegex.test(email.replace(/\s/g, ''));
    
    if (isPhoneNumber) {
      // Handle phone number login - find user by phone and generate magic link
      try {
        const formattedPhone = email.startsWith('0') 
          ? '+27' + email.substring(1) 
          : email.replace(/\s/g, '');
        
        // Check if user exists with this phone number
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', formattedPhone)
          .single();
          
        if (profileError || !profile) {
          return {
            data: null,
            error: new Error('No account found with this phone number. Please sign up first or use email/password.')
          };
        }
        
        // Find the auth user ID and generate a session
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: `temp-${profile.id}@temp.nannygold.co.za`,
        });
        
        if (sessionError) {
          return {
            data: null,
            error: new Error('Failed to sign in with phone number. Please try email/password instead.')
          };
        }
        
        // Set the session using the hashed token from the action link
        if (!sessionData.properties?.hashed_token) {
          return {
            data: null,
            error: new Error('Failed to generate session tokens')
          };
        }
        
        // Use the magic link to authenticate
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: sessionData.properties.hashed_token,
          type: 'magiclink'
        });
        
        return { data, error };
      } catch (error: any) {
        return {
          data: null,
          error: new Error('Phone number login failed. Please try email/password instead.')
        };
      }
    }
    
    // Regular email/password login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Prevent admin login attempts via regular auth screen
    if (!error && data?.user && window.location.pathname === '/auth') {
      try {
        const { getUserRole } = await import('@/utils/userUtils');
        const role = await getUserRole(data.user.id);
        if (role === 'admin') {
          // Sign out admin if they try to use regular login
          await supabase.auth.signOut();
          return {
            data: null,
            error: new Error('Admin users must use the dedicated admin login portal.')
          };
        }
      } catch (roleError) {
        console.log('Could not check role during login attempt');
      }
    }
    
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
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

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  };
};

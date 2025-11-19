import { supabase, checkSupabaseConnection } from '@/integrations/supabase/client';
import { AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

export class AuthService {
  /**
   * Enhanced login with connection checks and better error handling
   */
  static async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Check basic connectivity
      if (!navigator.onLine) {
        return {
          success: false,
          error: 'No internet connection. Please check your network and try again.'
        };
      }

      // Check Supabase connectivity
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'Authentication service is temporarily unavailable. Please try again in a few moments.'
        };
      }

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.formatAuthError(error)
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Unable to connect to our servers. Please check your internet connection and try again.'
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Enhanced signup with connection checks and better error handling
   */
  static async signup(email: string, password: string, metadata?: object): Promise<AuthResult> {
    try {
      // Check basic connectivity
      if (!navigator.onLine) {
        return {
          success: false,
          error: 'No internet connection. Please check your network and try again.'
        };
      }

      // Check Supabase connectivity
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'Authentication service is temporarily unavailable. Please try again in a few moments.'
        };
      }

      // Attempt signup
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        return {
          success: false,
          error: this.formatAuthError(error)
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Unable to connect to our servers. Please check your internet connection and try again.'
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Send OTP with connection checks and better error handling
   */
  static async sendOTP(email: string, type: 'signup' | 'recovery' = 'signup'): Promise<AuthResult> {
    try {
      // Check basic connectivity
      if (!navigator.onLine) {
        return {
          success: false,
          error: 'No internet connection. Please check your network and try again.'
        };
      }

      // Check Supabase connectivity
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'Email service is temporarily unavailable. Please try again in a few moments.'
        };
      }

      // Send OTP via Supabase function
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { 
          email: email.toLowerCase().trim(),
          purpose: type
        }
      });

      if (error) {
        return {
          success: false,
          error: this.formatFunctionError(error)
        };
      }

      if (!data?.success) {
        return {
          success: false,
          error: 'Failed to send verification code. Please try again.'
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Send OTP error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Unable to connect to our email service. Please check your internet connection and try again.'
        };
      }
      
      return {
        success: false,
        error: 'Failed to send verification code. Please try again.'
      };
    }
  }

  /**
   * Password reset with connection checks and better error handling
   */
  static async resetPassword(email: string): Promise<AuthResult> {
    try {
      // Check basic connectivity
      if (!navigator.onLine) {
        return {
          success: false,
          error: 'No internet connection. Please check your network and try again.'
        };
      }

      // Check Supabase connectivity
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'Password reset service is temporarily unavailable. Please try again in a few moments.'
        };
      }

      // Send reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: this.formatAuthError(error)
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Unable to connect to our servers. Please check your internet connection and try again.'
        };
      }
      
      return {
        success: false,
        error: 'Failed to send password reset email. Please try again.'
      };
    }
  }

  /**
   * Format Supabase auth errors into user-friendly messages
   */
  private static formatAuthError(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'Email not confirmed':
        return 'Please check your email and click the verification link before signing in.';
      case 'User already registered':
        return 'An account with this email already exists. Please sign in instead.';
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long.';
      case 'Signup requires a valid password':
        return 'Please enter a valid password.';
      case 'Invalid email':
        return 'Please enter a valid email address.';
      case 'Too many requests':
        return 'Too many attempts. Please wait a moment before trying again.';
      default:
        return error.message || 'An authentication error occurred. Please try again.';
    }
  }

  /**
   * Format Supabase function errors into user-friendly messages
   */
  private static formatFunctionError(error: any): string {
    if (error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
      return 'Unable to connect to our servers. Please check your internet connection.';
    }
    if (error.message?.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    return error.message || 'A service error occurred. Please try again.';
  }
}

export default AuthService;
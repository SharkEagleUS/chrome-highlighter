import { getSupabaseClient } from '../client/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Authentication service for managing user authentication
 */
export class AuthService {
  private static instance: AuthService;
  private authStateListeners: ((state: AuthState) => void)[] = [];

  private constructor() {
    this.initAuthListener();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize auth state listener
   */
  private initAuthListener() {
    const supabase = getSupabaseClient();
    
    supabase.auth.onAuthStateChange((event, session) => {
      const authState: AuthState = {
        user: session?.user || null,
        session: session,
        isAuthenticated: !!session,
      };

      // Notify all listeners
      this.authStateListeners.forEach(listener => listener(authState));

      // Store auth state in chrome storage for quick access
      chrome.storage.local.set({
        authState: {
          isAuthenticated: authState.isAuthenticated,
          userId: authState.user?.id || null,
          email: authState.user?.email || null,
        }
      });
    });
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(
        listener => listener !== callback
      );
    };
  }

  /**
   * Sign up a new user
   */
  async signUp(credentials: SignUpCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: 'https://yttpypsszygaelvdbbiu.supabase.co/auth/v1/verify'
        }
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: error as AuthError 
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(credentials: SignInCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: error as AuthError 
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error };
      }

      // Clear local auth state
      await chrome.storage.local.remove('authState');

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  /**
   * Get current auth state from storage (fast, cached)
   */
  async getCachedAuthState(): Promise<{ isAuthenticated: boolean; userId: string | null; email: string | null }> {
    const result = await chrome.storage.local.get('authState');
    return result.authState || { isAuthenticated: false, userId: null, email: null };
  }

  /**
   * Reset password for user
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

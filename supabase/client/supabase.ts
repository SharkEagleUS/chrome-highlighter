import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Supabase configuration
// These should be set in your extension's configuration or environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get or create Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase URL and Anon Key must be configured');
    }

    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          getItem: async (key: string) => {
            const result = await chrome.storage.local.get(key);
            return result[key] || null;
          },
          setItem: async (key: string, value: string) => {
            await chrome.storage.local.set({ [key]: value });
          },
          removeItem: async (key: string) => {
            await chrome.storage.local.remove(key);
          },
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseInstance;
}

/**
 * Initialize Supabase client with custom configuration
 */
export function initSupabase(url: string, anonKey: string): SupabaseClient<Database> {
  supabaseInstance = createClient<Database>(url, anonKey, {
    auth: {
      storage: {
        getItem: async (key: string) => {
          const result = await chrome.storage.local.get(key);
          return result[key] || null;
        },
        setItem: async (key: string, value: string) => {
          await chrome.storage.local.set({ [key]: value });
        },
        removeItem: async (key: string) => {
          await chrome.storage.local.remove(key);
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}

export { supabaseInstance };

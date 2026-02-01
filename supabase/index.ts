/**
 * Supabase Integration - Main Export File
 * 
 * This file provides convenient access to all Supabase services and types.
 * Import from here instead of individual service files.
 */

// Client
export { getSupabaseClient, initSupabase } from './client/supabase';

// Services
export { authService, AuthService } from './services/auth';
export type { AuthState, SignUpCredentials, SignInCredentials } from './services/auth';

export { syncService, SyncService } from './services/sync';
export type { LocalHighlight, SyncStatus } from './services/sync';

export { storageService, StorageService } from './services/storage';
export type { HighlightPosition, PageHighlights } from './services/storage';

// Types
export type { Database, HighlightColor } from './types/database';

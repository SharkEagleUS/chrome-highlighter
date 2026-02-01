# Supabase Integration for Chrome Highlighter

This folder contains the Supabase integration for enabling cloud sync, multi-user support, and backup features in the Chrome Highlighter extension.

## Features

- **User Authentication**: Sign up and sign in with email/password
- **Cross-Device Sync**: Share highlights across multiple Chrome browsers
- **Cloud Backup**: Automatic backup of all highlights to Supabase
- **Real-time Sync**: Changes sync automatically across devices
- **Multi-User Support**: Each user has their own isolated highlight data

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Fill in your project details:
   - Project name: `chrome-highlighter` (or any name you prefer)
   - Database password: Choose a strong password
   - Region: Select the closest region to your users
4. Click "Create new project" and wait for it to initialize

### 2. Run Database Migration

1. In your Supabase project dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

This will create:
- `highlights` table for storing user highlights
- `sync_metadata` table for tracking device synchronization
- Row Level Security (RLS) policies to ensure users can only access their own data
- Indexes for optimal query performance
- Triggers for automatic timestamp updates

### 3. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 4. Configure the Extension

You have two options to configure the Supabase credentials:

#### Option A: Environment Variables (Development)

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Option B: Runtime Configuration (Production)

Use the `initSupabase` function to configure credentials at runtime:

```typescript
import { initSupabase } from './supabase/client/supabase';

initSupabase(
  'https://your-project.supabase.co',
  'your-anon-key-here'
);
```

### 5. Build and Test

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` folder

4. Test the authentication:
   - Click the extension icon to open the side panel
   - Go to the "Account" tab
   - Sign up with a new account
   - Verify you receive a confirmation email
   - Sign in with your credentials

## Architecture

### Folder Structure

```
supabase/
├── client/           # Supabase client configuration
│   └── supabase.ts   # Client initialization with Chrome storage adapter
├── services/         # Business logic services
│   ├── auth.ts       # Authentication service
│   ├── sync.ts       # Synchronization service
│   └── storage.ts    # Unified storage service (local + cloud)
├── types/            # TypeScript type definitions
│   └── database.ts   # Database schema types
├── migrations/       # SQL migration files
│   └── 001_initial_schema.sql
└── README.md         # This file
```

### Services Overview

#### Authentication Service (`services/auth.ts`)
- Sign up, sign in, sign out
- Session management
- Password reset
- Auth state listeners

#### Sync Service (`services/sync.ts`)
- Push highlights to cloud
- Pull highlights from cloud
- Real-time sync with Supabase Realtime
- Conflict resolution (last-write-wins)
- Device tracking

#### Storage Service (`services/storage.ts`)
- Unified interface for local and cloud storage
- Automatic sync on save/delete when authenticated
- Merge local and cloud data
- Full sync and import operations
- Offline support with local cache

## Usage

### In the Extension

Users can access cloud features through the "Account" tab in the side panel:

1. **Sign Up/Sign In**: Create an account or sign in
2. **Automatic Sync**: Highlights are automatically synced when saved or deleted
3. **Manual Sync**: Click "Sync Now" to force a full sync
4. **Import from Cloud**: Restore highlights from cloud backup

### For Developers

#### Using the Storage Service

```typescript
import { storageService } from './supabase/services/storage';

// Save a highlight (auto-syncs to cloud if authenticated)
await storageService.saveHighlight(url, highlight);

// Get highlights for a URL (merges local and cloud)
const highlights = await storageService.getHighlightsForUrl(url);

// Remove a highlight (auto-syncs to cloud if authenticated)
await storageService.removeHighlight(url, highlightId);

// Perform full sync
const { success, error } = await storageService.performFullSync();
```

#### Using the Auth Service

```typescript
import { authService } from './supabase/services/auth';

// Sign in
const { user, error } = await authService.signIn({
  email: 'user@example.com',
  password: 'password123'
});

// Check auth state
const isAuth = await authService.isAuthenticated();

// Listen for auth changes
authService.onAuthStateChange((state) => {
  console.log('Auth state:', state.isAuthenticated);
});
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled to ensure data isolation:

- Users can only read/write their own highlights
- User ID is automatically set from the authenticated session
- No user can access another user's data

### API Keys

- The **Anon Key** is safe to use in client-side code
- It only allows operations permitted by RLS policies
- Never expose your **Service Role Key** in the extension

## Troubleshooting

### "Supabase URL and Anon Key must be configured"

- Make sure you've set the environment variables or called `initSupabase()`
- Check that the values are correct (no extra spaces or quotes)

### "User not authenticated"

- Sign in through the Account tab
- Check that email verification is complete (if required)
- Try signing out and signing in again

### Sync not working

- Check your internet connection
- Verify RLS policies are correctly set up
- Check the browser console for error messages
- Ensure the migration was run successfully

### Real-time sync not updating

- Real-time features require a stable connection
- Check Supabase project status
- Verify the Realtime feature is enabled in your Supabase project

## Database Schema

### highlights table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| url | TEXT | Page URL |
| text | TEXT | Highlighted text |
| xpath | TEXT | XPath to the element |
| start_offset | INTEGER | Start offset in text node |
| end_offset | INTEGER | End offset in text node |
| before_context | TEXT | Text before highlight |
| after_context | TEXT | Text after highlight |
| comment | TEXT | Optional user comment |
| tags | TEXT[] | Optional tags |
| color | highlight_color | Highlight color |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### sync_metadata table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| device_id | TEXT | Unique device identifier |
| last_sync_at | TIMESTAMPTZ | Last sync timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |

## License

Same as the main project.

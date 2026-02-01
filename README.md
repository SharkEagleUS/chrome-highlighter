# Text Highlighter Chrome Extension

A Chrome extension (MV3) built with [WXT](https://wxt.dev/) that allows you to save and highlight text selections. Highlights persist and are automatically restored when you revisit the page.

## Features

### Core Features
- **Right-click to Save**: Select text on any webpage, right-click, and choose "Save & Highlight Text"
- **Persistent Highlights**: Highlights are saved to local storage and automatically restored on page revisit
- **Position Tracking**: Correctly identifies the exact text you highlighted, even when the same text appears multiple times on the page
- **Side Panel**: View and manage all your highlights in Chrome's side panel
- **Easy Removal**: Alt+Click on a highlight or use the context menu to remove it

### Cloud Sync Features (Optional)
- **Cross-Device Sync**: Share highlights between Chrome browsers on different devices
- **User Authentication**: Multi-user support with email/password authentication
- **Cloud Backup**: Automatic backup of all highlights to Supabase
- **Real-time Sync**: Changes sync automatically across devices
- **Offline Support**: Works offline with local storage, syncs when online

> **Note**: Cloud sync requires Supabase setup. See [supabase/README.md](supabase/README.md) for configuration instructions.

## How Position Tracking Works

The extension uses multiple strategies to accurately identify highlighted text:

1. **XPath + Offset**: Stores the XPath to the container element and the character offset within it
2. **Context Matching**: Stores surrounding text (50 characters before/after) to verify correct matches
3. **Fallback Matching**: If exact offset fails, uses context to find the correct occurrence

## Installation

### Development

```bash
# Install dependencies
npm install

# Start development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Create zip for distribution
npm run zip
```

### Load in Chrome

1. Run `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `.output/chrome-mv3` folder

## Usage

1. **Save a highlight**: Select text → Right-click → "Save & Highlight Text"
2. **View highlights**: Click the extension icon to open the side panel
3. **Remove a highlight**:
   - Alt+Click on the highlighted text, OR
   - Click "Delete" in the side panel
4. **Revisit a page**: Highlights are automatically restored

## Project Structure

```
chrome-highlighter/
├── entrypoints/
│   ├── background.ts        # Background service worker (with Supabase integration)
│   ├── content.ts           # Content script (injected into pages)
│   └── sidepanel/           # Side panel UI
│       ├── index.html       # UI with Account tab for authentication
│       ├── main.ts          # Main side panel logic
│       └── auth-ui.ts       # Authentication UI handler
├── supabase/                # Supabase cloud sync integration
│   ├── client/              # Supabase client configuration
│   ├── services/            # Auth, sync, and storage services
│   ├── types/               # TypeScript database types
│   ├── migrations/          # SQL migration files
│   ├── index.ts             # Main export file
│   └── README.md            # Supabase setup guide
├── utils/
│   ├── storage.ts           # Storage utilities
│   └── modal.ts             # Modal utilities
├── wxt.config.ts            # WXT configuration
├── .env.example             # Example environment configuration
└── package.json
```

## Technical Details

- **Manifest Version**: 3 (MV3)
- **Framework**: WXT (Vite-based extension framework)
- **Storage**: Chrome Local Storage (with optional Supabase cloud sync)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Permissions**: `storage`, `contextMenus`, `sidePanel`

## Cloud Sync Setup

To enable cloud sync features:

1. Follow the setup guide in [supabase/README.md](supabase/README.md)
2. Create a Supabase project and run the database migration
3. Configure your credentials in `.env` (copy from `.env.example`)
4. Build and reload the extension
5. Use the "Account" tab in the side panel to sign up/sign in

The extension works fully offline without Supabase configuration. Cloud sync is an optional enhancement.

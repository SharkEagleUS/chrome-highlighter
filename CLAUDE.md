# Chrome Highlighter Extension - AI Assistant Instructions

## Project Overview

This is a Chrome Extension (Manifest V3) built with WXT framework that provides text highlighting functionality with persistent storage. Users can select text on any webpage, save highlights via context menu, and have them automatically restored on page revisit.

## Tech Stack

- **Framework**: WXT (Vite-based Chrome Extension framework)
- **Language**: TypeScript
- **Manifest**: Chrome Extension MV3
- **Storage**: Chrome Local Storage API
- **Build Tool**: Vite (via WXT)

## Architecture

### Component Structure

```
entrypoints/
├── background.ts        # Service worker (handles context menu, storage events)
├── content.ts           # Content script (DOM manipulation, highlighting)
└── sidepanel/          # Side panel UI (view/manage highlights)
    ├── index.html
    └── main.ts

utils/
├── storage.ts          # Chrome storage abstractions
└── highlighter.ts      # DOM highlighting logic
```

### Key Architectural Patterns

1. **Content Script Isolation**: Content scripts run in isolated context - communicate via messages
2. **Background Service Worker**: Handles cross-page logic, context menus, storage coordination
3. **XPath-based Selection**: Uses XPath + character offset for precise text location tracking
4. **Context-based Fallback**: Stores surrounding text context for robust re-highlighting

## Development Guidelines

### Core Principles

1. **MV3 Constraints**: No persistent background page - use event-driven service workers
2. **Security First**: Content Security Policy (CSP) compliant - no inline scripts/eval
3. **DOM Safety**: Always check if elements exist before manipulation
4. **Storage Efficiency**: Use local storage sparingly, batch updates when possible

### Code Conventions

- **Naming**: camelCase for functions/variables, PascalCase for types/interfaces
- **Async/Await**: Prefer async/await over .then() chains
- **Error Handling**: Always wrap storage/DOM operations in try-catch
- **Type Safety**: Leverage TypeScript strict mode, avoid `any`

### Testing Approach

**Manual Testing Checklist**:
- [ ] Text selection and highlight creation
- [ ] Highlight restoration on page reload
- [ ] Multiple highlights on same page
- [ ] Alt+Click removal
- [ ] Context menu operations
- [ ] Side panel functionality
- [ ] Cross-page storage isolation

### Common Patterns

#### Storage Operations
```typescript
// Always use type-safe storage utilities from utils/storage.ts
import { getHighlights, saveHighlight } from '@/utils/storage';

// Check return values for null/undefined
const highlights = await getHighlights(pageUrl);
if (!highlights) return;
```

#### DOM Manipulation
```typescript
// Always verify elements exist
const element = document.querySelector('.highlight');
if (!element) {
  console.warn('Element not found');
  return;
}

// Use MutationObserver for dynamic content
const observer = new MutationObserver(callback);
observer.observe(document.body, { childList: true, subtree: true });
```

#### Message Passing
```typescript
// Content script to background
chrome.runtime.sendMessage({ type: 'SAVE_HIGHLIGHT', data });

// Background to content script
chrome.tabs.sendMessage(tabId, { type: 'RESTORE_HIGHLIGHTS' });
```

## Development Workflow

### Setup
```bash
npm install          # Install dependencies
npm run dev          # Start development with hot reload
```

### Build & Test
```bash
npm run build        # Production build
npm run zip          # Create distribution package
```

### Load in Chrome
1. Build the extension: `npm run build`
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `.output/chrome-mv3/`

### Debugging

- **Background Script**: `chrome://extensions/` → "Inspect views: service worker"
- **Content Script**: Right-click page → Inspect → Console (filter by content.ts)
- **Side Panel**: Right-click side panel → Inspect

## Critical Implementation Details

### Position Tracking Strategy

The extension uses a multi-layered approach to track highlight positions:

1. **Primary**: XPath to container + character offset within text node
2. **Verification**: 50-char context before/after for validation
3. **Fallback**: Context-based fuzzy matching if offset fails

### Known Edge Cases

- **Dynamic Content**: Pages with dynamic DOM updates may lose highlights
- **SPA Navigation**: Single-page apps need special handling for URL changes
- **iFrames**: Highlights don't persist across iframe boundaries
- **Shadow DOM**: Limited support for web components with shadow DOM

### Performance Considerations

- Limit highlight restoration to ~100 highlights per page
- Use debouncing for rapid selection changes
- Lazy-load side panel data
- Clean up old highlights periodically (consider TTL)

## Extension Permissions

Required permissions in manifest.json:
- `storage`: For saving highlights
- `contextMenus`: For right-click menu
- `sidePanel`: For side panel UI
- `activeTab`: For accessing current page content

## Future Enhancement Ideas

- [ ] Highlight color customization
- [ ] Export/import highlights
- [ ] Search within highlights
- [ ] Sync across devices (Chrome Sync API)
- [ ] Keyboard shortcuts
- [ ] Highlight annotations/notes
- [ ] Categories/tags for highlights

## Troubleshooting

### Common Issues

1. **Highlights not restoring**: Check XPath validity, verify storage format
2. **Context menu missing**: Ensure background script registered properly
3. **Side panel empty**: Check message passing between content/background
4. **Memory leaks**: Ensure MutationObservers are disconnected properly

### Debug Commands
```javascript
// Check stored highlights in DevTools console
chrome.storage.local.get(null, (data) => console.log(data));

// Clear all highlights
chrome.storage.local.clear();
```

## AI Assistant Behavior

When working on this project:

1. **Always test MV3 compatibility** - No persistent background, event-driven only
2. **Verify CSP compliance** - No eval(), no inline scripts
3. **Check XPath robustness** - Test on different DOM structures
4. **Consider edge cases** - Dynamic content, SPAs, iframes
5. **Preserve existing patterns** - Follow utils structure, message format
6. **Update README** - Document new features, API changes
7. **Test in real browser** - Extension behavior differs from regular web apps

### Before Making Changes

1. Read relevant source files first (don't guess)
2. Understand existing storage schema
3. Check how current highlighting logic works
4. Test changes in actual Chrome extension environment

### Commit Guidelines

- Format: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore
- Examples:
  - `feat(highlight): add color customization`
  - `fix(storage): handle edge case for duplicate highlights`
  - `refactor(content): optimize XPath generation`

// Types for highlight storage
export interface HighlightPosition {
  text: string;
  // XPath to the container element
  xpath: string;
  // Text offset within the container
  startOffset: number;
  endOffset: number;
  // Surrounding context for verification
  beforeContext: string;
  afterContext: string;
  // Unique ID for this highlight
  id: string;
  // Timestamp
  createdAt: number;
  // Optional comment
  comment?: string;
  // Optional tags
  tags?: string[];
}

export interface PageHighlights {
  url: string;
  highlights: HighlightPosition[];
}

// Generate a unique ID
export function generateId(): string {
  return `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get XPath for an element
export function getXPath(element: Node): string {
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentNode!;
  }
  
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = element as Element;
  
  if (el.id) {
    return `//*[@id="${el.id}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && 
          (sibling as Element).tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

// Get element by XPath
export function getElementByXPath(xpath: string): Element | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue as Element;
  } catch {
    return null;
  }
}

// Normalize URL for storage key
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove hash and trailing slash
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`;
  } catch {
    return url;
  }
}

// Storage key prefix
const STORAGE_PREFIX = 'highlights_';

// Get storage key for a URL
export function getStorageKey(url: string): string {
  return STORAGE_PREFIX + normalizeUrl(url);
}

// Save highlights for a page
export async function saveHighlights(url: string, highlights: HighlightPosition[]): Promise<void> {
  const key = getStorageKey(url);
  const data: PageHighlights = { url: normalizeUrl(url), highlights };
  await chrome.storage.local.set({ [key]: data });
}

// Load highlights for a page
export async function loadHighlights(url: string): Promise<HighlightPosition[]> {
  const key = getStorageKey(url);
  const result = await chrome.storage.local.get(key);
  const data = result[key] as PageHighlights | undefined;
  return data?.highlights || [];
}

// Add a new highlight
export async function addHighlight(url: string, highlight: HighlightPosition): Promise<void> {
  const highlights = await loadHighlights(url);
  highlights.push(highlight);
  await saveHighlights(url, highlights);
}

// Remove a highlight by ID
export async function removeHighlight(url: string, highlightId: string): Promise<void> {
  const highlights = await loadHighlights(url);
  const filtered = highlights.filter(h => h.id !== highlightId);
  await saveHighlights(url, filtered);
}

// Get all highlights across all pages
export async function getAllHighlights(): Promise<PageHighlights[]> {
  const result = await chrome.storage.local.get(null);
  const pages: PageHighlights[] = [];
  
  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith(STORAGE_PREFIX)) {
      pages.push(value as PageHighlights);
    }
  }
  
  return pages;
}

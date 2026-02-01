import { HighlightPosition, getElementByXPath, getXPath, generateId } from './storage';

const HIGHLIGHT_CLASS = 'text-highlighter-extension-mark';
const HIGHLIGHT_STYLE = `
  .${HIGHLIGHT_CLASS} {
    background-color: #ffeb3b !important;
    border-radius: 2px;
    padding: 0 2px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .${HIGHLIGHT_CLASS}:hover {
    background-color: #ffc107 !important;
  }
`;

// Inject styles
export function injectHighlightStyles(): void {
  if (document.getElementById('text-highlighter-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'text-highlighter-styles';
  style.textContent = HIGHLIGHT_STYLE;
  document.head.appendChild(style);
}

// Create highlight position data from selection
export function createHighlightFromSelection(selection: Selection): HighlightPosition | null {
  if (!selection.rangeCount || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();
  
  if (!text) return null;

  const container = range.commonAncestorContainer;
  const xpath = getXPath(container);
  
  // Get surrounding context for accurate matching
  const containerText = container.textContent || '';
  const textStart = containerText.indexOf(text);
  const beforeContext = containerText.substring(Math.max(0, textStart - 30), textStart);
  const afterContext = containerText.substring(textStart + text.length, textStart + text.length + 30);

  // Calculate offset within the container
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preRange.toString().length;

  return {
    id: generateId(),
    text,
    xpath,
    startOffset,
    endOffset: startOffset + text.length,
    beforeContext,
    afterContext,
    createdAt: Date.now()
  };
}

// Find and highlight text in page based on stored position
export function applyHighlight(position: HighlightPosition): boolean {
  const container = getElementByXPath(position.xpath);
  if (!container) return false;

  // Use TreeWalker to find all text nodes in the container
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  // Find the exact text nodes and offsets
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const nodeLength = node.textContent?.length || 0;
    
    if (startNode === null && currentOffset + nodeLength > position.startOffset) {
      startNode = node;
      startNodeOffset = position.startOffset - currentOffset;
    }
    
    if (currentOffset + nodeLength >= position.endOffset) {
      endNode = node;
      endNodeOffset = position.endOffset - currentOffset;
      break;
    }
    
    currentOffset += nodeLength;
  }

  if (!startNode || !endNode) {
    // Fallback: try to find by context matching
    return applyHighlightByContext(container, position);
  }

  // Verify the text matches
  const range = document.createRange();
  try {
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    
    const rangeText = range.toString();
    if (rangeText !== position.text) {
      return applyHighlightByContext(container, position);
    }
  } catch {
    return applyHighlightByContext(container, position);
  }

  // Create highlight element
  return wrapRangeWithHighlight(range, position.id);
}

// Fallback: find text by surrounding context
function applyHighlightByContext(container: Element, position: HighlightPosition): boolean {
  const containerText = container.textContent || '';
  
  // Build a pattern with context
  const searchPattern = position.beforeContext + position.text + position.afterContext;
  const contextIndex = containerText.indexOf(searchPattern);
  
  let textStart: number;
  if (contextIndex >= 0) {
    textStart = contextIndex + position.beforeContext.length;
  } else {
    // Try without context
    textStart = containerText.indexOf(position.text);
    if (textStart < 0) return false;
  }

  // Find the text node and offset
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const nodeLength = node.textContent?.length || 0;
    
    if (startNode === null && currentOffset + nodeLength > textStart) {
      startNode = node;
      startNodeOffset = textStart - currentOffset;
    }
    
    if (currentOffset + nodeLength >= textStart + position.text.length) {
      endNode = node;
      endNodeOffset = textStart + position.text.length - currentOffset;
      break;
    }
    
    currentOffset += nodeLength;
  }

  if (!startNode || !endNode) return false;

  try {
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return wrapRangeWithHighlight(range, position.id);
  } catch {
    return false;
  }
}

// Wrap a range with highlight markup
function wrapRangeWithHighlight(range: Range, highlightId: string): boolean {
  try {
    const mark = document.createElement('mark');
    mark.className = HIGHLIGHT_CLASS;
    mark.dataset.highlightId = highlightId;
    
    range.surroundContents(mark);
    return true;
  } catch {
    // Handle complex ranges that span multiple elements
    const fragment = range.extractContents();
    const mark = document.createElement('mark');
    mark.className = HIGHLIGHT_CLASS;
    mark.dataset.highlightId = highlightId;
    mark.appendChild(fragment);
    range.insertNode(mark);
    return true;
  }
}

// Remove highlight by ID
export function removeHighlightFromPage(highlightId: string): void {
  const mark = document.querySelector(`[data-highlight-id="${highlightId}"]`);
  if (mark) {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent?.insertBefore(mark.firstChild, mark);
    }
    mark.remove();
    parent?.normalize();
  }
}

// Highlight selection immediately
export function highlightSelection(selection: Selection, highlightId: string): boolean {
  if (!selection.rangeCount || selection.isCollapsed) return false;
  
  const range = selection.getRangeAt(0);
  return wrapRangeWithHighlight(range, highlightId);
}
